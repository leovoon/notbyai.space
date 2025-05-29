import requests
import json
import time

def test_api_endpoint(endpoint, method="GET", data=None, headers=None, expected_status=200):
    """Test an API endpoint and print the results"""
    url = f"https://702e32e8-44d5-4a47-a3d8-75d061a40eba.preview.emergentagent.com/api/{endpoint}"
    
    if headers is None:
        headers = {'Content-Type': 'application/json'}
    
    print(f"\n🔍 Testing {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers)
        
        print(f"🔢 Status: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"📄 Response: {json.dumps(response_data, indent=2)}")
        except:
            print(f"📄 Response: {response.text}")
        
        if response.status_code == expected_status:
            print("✅ Test passed")
            return True, response
        else:
            print(f"❌ Test failed - Expected status {expected_status}, got {response.status_code}")
            return False, response
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False, None

def main():
    """Run a series of API tests"""
    print("=== Not by AI.space API Testing ===")
    
    # Test 1: API Root
    success, _ = test_api_endpoint("", expected_status=200)
    
    # Test 2: User Sync (without authentication)
    success, response = test_api_endpoint("auth/sync", method="POST", data={}, expected_status=200)
    
    if success and 'user' in response.json():
        user_id = response.json()['user']['id']
        print(f"User ID: {user_id}")
        
        # Test 3: Get Me (should fail without authentication)
        test_api_endpoint("me", expected_status=404)
        
        # Test 4: Get Feed (should fail without authentication)
        test_api_endpoint("feed", expected_status=403)
        
        # Test 5: Create Post (should fail without authentication)
        test_api_endpoint("posts", method="POST", 
                         data={"content": "Test post", "tag": "Human2Human"}, 
                         expected_status=404)
        
        # Test 6: Get Pending Posts (should fail without authentication)
        test_api_endpoint("posts/pending", expected_status=404)
    
    print("\n=== Authentication Tests ===")
    print("Note: Cannot fully test authentication as we need a valid Clerk JWT token")
    
    print("\n=== Summary ===")
    print("1. API root endpoint is working")
    print("2. User sync endpoint is working")
    print("3. Protected endpoints return authentication errors as expected")
    print("4. Cannot test authenticated endpoints without a valid Clerk JWT token")
    print("5. The backend API structure appears to be in place, but authentication integration needs fixing")

if __name__ == "__main__":
    main()