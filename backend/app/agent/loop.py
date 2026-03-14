"""
Gemini AI agent loop with function-calling.
Uses google-generativeai to register tool functions and run
a multi-turn tool-calling loop until Gemini returns a final text answer.
"""

import os
import json
import warnings
from dotenv import load_dotenv

# Suppress the deprecation warning from google.generativeai
warnings.filterwarnings("ignore", message=".*google.generativeai.*")

import google.generativeai as genai

from app.agent.tools import (
    get_all_transactions,
    get_vendor_profile,
    get_audit_flags,
    insert_audit_flag,
    run_anomaly_scan,
    generate_audit_report,
)

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# ── System prompt ─────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are a financial audit AI assistant. You have NO knowledge of "
    "the data — you MUST call tools to retrieve facts before making any claim. "
    "Never guess numbers. Always cite the transaction ID and rule when flagging.\n\n"
    "Available tools:\n"
    "- get_all_transactions(limit) — fetch recent transactions with vendor names\n"
    "- get_vendor_profile(vendor_id) — vendor info + stats + flag count\n"
    "- get_audit_flags(severity) — fetch flags, optional severity filter\n"
    "- insert_audit_flag(txn_id, reason, severity) — write a flag to the database\n"
    "- run_anomaly_scan() — check ALL transactions against audit rules, return suspicious ones\n"
    "- generate_audit_report(period_from, period_to, user_id) — aggregate flags into a report\n\n"
    "When asked to scan or audit, ALWAYS call run_anomaly_scan() first, "
    "then insert_audit_flag() for each anomaly found. "
    "Provide a clear, structured summary at the end."
)

# ── Tool declarations for Gemini function calling ─────────────

TOOL_FUNCTIONS = {
    "get_all_transactions": get_all_transactions,
    "get_vendor_profile": get_vendor_profile,
    "get_audit_flags": get_audit_flags,
    "insert_audit_flag": insert_audit_flag,
    "run_anomaly_scan": run_anomaly_scan,
    "generate_audit_report": generate_audit_report,
}

# Define tools using Gemini's function declaration format
tool_declarations = [
    genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name="get_all_transactions",
                description="Fetch the most recent transactions with vendor and category names.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "limit": genai.protos.Schema(
                            type=genai.protos.Type.INTEGER,
                            description="Maximum number of transactions to return (default 20)",
                        ),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_vendor_profile",
                description="Get vendor info including stats and audit flag count.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "vendor_id": genai.protos.Schema(
                            type=genai.protos.Type.INTEGER,
                            description="The vendor ID to look up",
                        ),
                    },
                    required=["vendor_id"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_audit_flags",
                description="Fetch audit flags, optionally filtered by severity (High, Medium, or Low).",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "severity": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="Optional severity filter: High, Medium, or Low",
                        ),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="insert_audit_flag",
                description="Insert a new audit flag for a transaction into the database.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "txn_id": genai.protos.Schema(
                            type=genai.protos.Type.INTEGER,
                            description="Transaction ID to flag",
                        ),
                        "reason": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="Reason for the flag, including rule name and specifics",
                        ),
                        "severity": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="Severity level: High, Medium, or Low",
                        ),
                    },
                    required=["txn_id", "reason", "severity"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="run_anomaly_scan",
                description="Check ALL transactions against audit rule thresholds. Returns list of suspicious transactions with reasons.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={},
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="generate_audit_report",
                description="Aggregate all flags in a date range and write a summary report to the database.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "period_from": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="Start date in YYYY-MM-DD format",
                        ),
                        "period_to": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            description="End date in YYYY-MM-DD format",
                        ),
                        "user_id": genai.protos.Schema(
                            type=genai.protos.Type.INTEGER,
                            description="User ID of the person generating the report",
                        ),
                    },
                    required=["period_from", "period_to", "user_id"],
                ),
            ),
        ]
    )
]

# ── Agent loop ────────────────────────────────────────────────

def run_agent(user_message: str) -> dict:
    """Run the full Gemini agent loop.

    Returns:
        {
            "response": str,        # Final text answer from Gemini
            "tools_called": list,   # List of tool names that were invoked
        }
    """
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        tools=tool_declarations,
        system_instruction=SYSTEM_PROMPT,
    )

    chat = model.start_chat()
    tools_called: list[str] = []

    # Send the user's message
    response = chat.send_message(user_message)

    # Loop until Gemini returns a text answer (no more function calls)
    max_iterations = 20  # safety limit
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # Check if the response has function calls
        function_calls = []
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if part.function_call and part.function_call.name:
                    function_calls.append(part.function_call)

        if not function_calls:
            # No more function calls — extract final text
            break

        # Execute each function call and collect responses
        function_responses = []
        for fc in function_calls:
            fn_name = fc.name
            fn_args = dict(fc.args) if fc.args else {}

            print(f"  🔧 Calling tool: {fn_name}({fn_args})")
            tools_called.append(fn_name)

            # Execute the tool
            fn = TOOL_FUNCTIONS.get(fn_name)
            if fn:
                try:
                    result = fn(**fn_args)
                except Exception as e:
                    result = {"error": str(e)}
            else:
                result = {"error": f"Unknown tool: {fn_name}"}

            # Build function response
            function_responses.append(
                genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=fn_name,
                        response={"result": json.loads(json.dumps(result, default=str))},
                    )
                )
            )

        # Send function responses back to Gemini
        response = chat.send_message(
            genai.protos.Content(parts=function_responses)
        )

    # Extract final text
    final_text = ""
    for candidate in response.candidates:
        for part in candidate.content.parts:
            if part.text:
                final_text += part.text

    return {
        "response": final_text,
        "tools_called": tools_called,
    }
