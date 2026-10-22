from takehome.services.brief import MatterBrief


def tenant_brief(**changes):
    return MatterBrief.model_validate(
        {
            "objective": "Help my tenant exit in 2029",
            "client_role": "tenant",
            "outcome": "Prepare a client update on exit feasibility",
            "deliverable": "client_update",
            "priorities": ["Check break conditions", "Identify missing compliance facts"],
            "open_questions": ["Has notice been served?"],
            "sections": [
                {"title": "Exit feasibility", "purpose": "Explain the stated break mechanism"},
                {"title": "Conditions to resolve", "purpose": "Link evidence and enquiries"},
                {"title": "Next steps", "purpose": "Identify client decisions"},
            ],
            **changes,
        }
    )
