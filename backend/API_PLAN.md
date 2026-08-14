# Campaign Management Backend API Plan

Jira: DCRM2-5  
Status: Draft  
Data: Fictional test data only

## Proposed technology

- Node.js
- Express
- Initial mock/in-memory data
- Database connection will be completed separately under DCRM2-13

The technology proposal requires technical review before final approval.

## Campaign fields

- id
- campaignName
- client
- brand
- objective
- targetAudience
- startDate
- endDate
- budget
- channel
- status

## Allowed channels

- Facebook
- Instagram

## Allowed statuses

- Draft
- Active
- Paused
- Completed

## Planned API endpoints

### GET /api/health

Purpose: Confirm that the backend is running.

Successful response:

{
  "success": true,
  "message": "Divinenet CRM API is running"
}

### GET /api/campaigns

Purpose: Return all campaigns.

### GET /api/campaigns/:id

Purpose: Return one campaign using its ID.

### POST /api/campaigns

Purpose: Create a campaign.

### PUT /api/campaigns/:id

Purpose: Update an existing campaign.

### DELETE /api/campaigns/:id

Purpose: Delete a campaign.

## Validation rules

- Campaign name is required.
- Client is required.
- Brand is required.
- Objective is required.
- Target audience is required.
- Start date is required.
- End date is required.
- End date cannot be before the start date.
- Budget must be zero or greater.
- Channel must be Facebook or Instagram.
- Status must be Draft, Active, Paused or Completed.
- Real customer information must not be used.

## Response format

Successful response:

{
  "success": true,
  "data": {}
}

Error response:

{
  "success": false,
  "message": "Clear error explanation"
}

## Expected result

The frontend will send JSON requests to the backend. The backend will validate the request and return a JSON response.

## Excluded from this Jira task

- Database implementation
- Claude integration
- Meta integration
- Phase 1 integration
- Lead scoring
- Conversion logic
