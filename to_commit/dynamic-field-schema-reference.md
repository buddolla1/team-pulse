# Dynamic Field Schema Reference

Use this naming convention for every dynamic schema:

- `module_key`: feature area, lowercase with underscores
- `entity_key`: record type inside that feature, lowercase with underscores
- `schema_key`: `module_key` + `_` + `entity_key` + `_v<number>`

## Examples

### Release Management

```text
schema_name = Release Management Custom Fields
module_key = release_management
entity_key = release
schema_key = release_management_release_v1
```

Existing fields already on the page:

- `release_month`
- `planned_release_date`
- `release_planning_status`
- `rts_handover_planned_date`
- `release_tag`
- `application_name`
- `release_name`
- `build_program_manager`
- `qe_program_manager`
- `release_spoc`
- `pre_deployment_checklist`
- `implementation_plan`
- `rollback_plan`
- `post_deployment_checklist`
- `rts_handover`
- `build_preparation_checklist`
- `test_case_checklist`
- `dor`
- `dod`
- `pre_deployment_checklist_execution`
- `post_deployment_checklist_execution`
- `release_encountered_issue`
- `issue_description`
- `remedy`
- `release_status`
- `retro`
- `remarks`
- `auditor`

Example custom fields to add in Dynamic Fields:

```text
field_key = release_owner
field_label = Release Owner
field_type = text

field_key = business_unit
field_label = Business Unit
field_type = select

field_key = deployment_notes
field_label = Deployment Notes
field_type = textarea
```

### Incident Tracker

```text
schema_name = Incident Tracker Custom Fields
module_key = incident_tracker
entity_key = incident
schema_key = incident_tracker_incident_v1
```

### Employees

```text
schema_name = Employee Custom Fields
module_key = employee
entity_key = employee
schema_key = employee_employee_v1
```

### Projects

```text
schema_name = Projects Custom Fields
module_key = projects
entity_key = project
schema_key = projects_project_v1
```

### Project Teams

```text
schema_name = Project Team Custom Fields
module_key = projects
entity_key = team
schema_key = projects_team_v1
```

### Assets

```text
schema_name = Asset Custom Fields
module_key = assets
entity_key = asset
schema_key = assets_asset_v1
```

### Invoices

```text
schema_name = Invoice Custom Fields
module_key = invoices
entity_key = invoice
schema_key = invoices_invoice_v1
```

### Purchase Orders

```text
schema_name = Purchase Order Custom Fields
module_key = pos
entity_key = po
schema_key = pos_po_v1
```

### Leave Tracker

```text
schema_name = Leave Tracker Custom Fields
module_key = leave_tracker
entity_key = leave
schema_key = leave_tracker_leave_v1
```

### Sprint KPI

```text
schema_name = Sprint KPI Custom Fields
module_key = sprint_kpi
entity_key = sprint_kpi
schema_key = sprint_kpi_sprint_kpi_v1
```

### Visa History

```text
schema_name = Visa History Custom Fields
module_key = visa
entity_key = visa_history
schema_key = visa_visa_history_v1
```

### Admin Users

```text
schema_name = Admin User Custom Fields
module_key = admin
entity_key = admin_user
schema_key = admin_admin_user_v1
```

### Roles

```text
schema_name = Role Custom Fields
module_key = admin
entity_key = role
schema_key = admin_role_v1
```

## Rules

- use lowercase only
- use underscores, not spaces or hyphens
- keep `schema_key` unique
- bump the version when making a breaking schema change, like `v2`, `v3`

## Recommended first schema

For Release Management, start with:

```text
release_management_release_v1
```
