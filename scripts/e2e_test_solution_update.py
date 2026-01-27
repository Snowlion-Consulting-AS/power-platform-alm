#!/usr/bin/env python3
"""
E2E Test: Update Solution Description via Dataverse Web API

This script tests write operations to the Dataverse Web API by:
1. Authenticating with SPN credentials
2. Querying the SnowlionBusinessApplication solution
3. Updating its description to append "[CI/CD verified]"
4. Verifying the update was successful
"""

import urllib.request
import urllib.parse
import json
import os
import sys


def get_access_token():
    """Get an OAuth access token for Dataverse Web API."""
    env_url = os.environ['PP_ENVIRONMENT_URL'].rstrip('/')
    client_id = os.environ['PP_CLIENT_ID']
    client_secret = os.environ['PP_CLIENT_SECRET']
    tenant_id = os.environ['PP_TENANT_ID']

    print(f"🔐 Authenticating to {env_url}...")

    data = urllib.parse.urlencode({
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
        'scope': f'{env_url}/.default'
    }).encode()

    req = urllib.request.Request(
        f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token',
        data=data
    )

    try:
        response = urllib.request.urlopen(req)
        token_data = json.loads(response.read())
        print("✅ Authentication successful")
        return token_data['access_token'], env_url
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        sys.exit(1)


def query_solution(token, env_url, solution_name):
    """Query the solution to get its current description."""
    print(f"\n🔍 Querying solution '{solution_name}'...")

    # Properly construct the OData query URL
    base_url = f"{env_url}/api/data/v9.2/solutions"
    query_params = {
        '$select': 'solutionid,uniquename,description',
        '$filter': f"uniquename eq '{solution_name}'"
    }
    url = f"{base_url}?{urllib.parse.urlencode(query_params)}"

    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('OData-MaxVersion', '4.0')
    req.add_header('OData-Version', '4.0')
    req.add_header('Accept', 'application/json')

    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read())
        solutions = data.get('value', [])

        if not solutions:
            print(f"❌ Solution '{solution_name}' not found")
            sys.exit(1)

        solution = solutions[0]
        print(f"✅ Found solution:")
        print(f"   ID: {solution['solutionid']}")
        print(f"   Name: {solution['uniquename']}")
        print(f"   Current description: {solution.get('description', '(empty)')}")

        return solution
    except Exception as e:
        print(f"❌ Query failed: {e}")
        sys.exit(1)


def update_solution_description(token, env_url, solution_id, new_description):
    """Update the solution description."""
    print(f"\n📝 Updating solution description...")
    print(f"   New description: {new_description}")

    url = f"{env_url}/api/data/v9.2/solutions({solution_id})"

    patch_data = json.dumps({'description': new_description}).encode()

    req = urllib.request.Request(url, data=patch_data, method='PATCH')
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('OData-MaxVersion', '4.0')
    req.add_header('OData-Version', '4.0')

    try:
        urllib.request.urlopen(req)
        print("✅ Update successful")
        return True
    except Exception as e:
        print(f"❌ Update failed: {e}")
        return False


def verify_update(token, env_url, solution_name, expected_description):
    """Verify the update by querying the solution again."""
    print(f"\n🔍 Verifying update...")

    solution = query_solution(token, env_url, solution_name)
    actual_description = solution.get('description', '')

    if actual_description == expected_description:
        print(f"✅ Verification successful!")
        print(f"   Description matches expected value")
        return True
    else:
        print(f"❌ Verification failed!")
        print(f"   Expected: {expected_description}")
        print(f"   Actual: {actual_description}")
        return False


def main():
    """Main function to run the E2E test."""
    print("=" * 60)
    print("E2E Test: Update Solution Description via Dataverse Web API")
    print("=" * 60)

    # Step 1: Authenticate
    token, env_url = get_access_token()

    # Step 2: Query the solution
    solution_name = 'SnowlionBusinessApplication'
    solution = query_solution(token, env_url, solution_name)

    solution_id = solution['solutionid']
    current_description = solution.get('description', '')

    # Step 3: Prepare new description
    verification_tag = '[CI/CD verified]'

    # Check if already verified
    if verification_tag in current_description:
        print(f"\n⚠️  Solution already contains '{verification_tag}'")
        print(f"   Removing old tag and re-appending...")
        # Remove old tag(s) to avoid duplication
        base_description = current_description.replace(verification_tag, '').strip()
    else:
        base_description = current_description.strip() if current_description else "Source of the core Snowlion Business Application solution."

    new_description = f"{base_description} {verification_tag}"

    # Step 4: Update the solution
    success = update_solution_description(token, env_url, solution_id, new_description)

    if not success:
        print("\n❌ E2E Test FAILED")
        sys.exit(1)

    # Step 5: Verify the update
    verified = verify_update(token, env_url, solution_name, new_description)

    if verified:
        print("\n" + "=" * 60)
        print("✅ E2E Test PASSED")
        print("=" * 60)
        print("\nResult:")
        print(f"  ✓ Successfully authenticated with SPN credentials")
        print(f"  ✓ Successfully queried solution via GET")
        print(f"  ✓ Successfully updated solution via PATCH")
        print(f"  ✓ Successfully verified the update")
        print("\n✅ SPN has write access to Dataverse")
        print("✅ Claude for GitHub can perform PATCH operations autonomously")
        sys.exit(0)
    else:
        print("\n❌ E2E Test FAILED - Verification failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
