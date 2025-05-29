import requests
import unittest
import json
import uuid
from datetime import datetime

class NotByAIAPITester(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(NotByAIAPITester, self).__init__(*args, **kwargs)
        self.base_url = "https://702e32e8-44d5-4a47-a3d8-75d061a40eba.preview.emergentagent.com/api"
        self.token = None
        self.user_id = None
        self.post_id = None
        
        # Mock JWT token for testing (simulating Clerk authentication)
        # In a real scenario, we would get this from Clerk after authentication
        # This is a simplified approach for testing
        self.mock_token = self.create_mock_token()

    def create_mock_token(self):
        """Create a mock JWT token with a payload similar to what Clerk would provide"""
        import base64
        import json
        
        # Create a mock header
        header = {"alg": "HS256", "typ": "JWT"}
        header_json = json.dumps(header).encode()
        header_b64 = base64.urlsafe_b64encode(header_json).decode().rstrip("=")
        
        # Create a mock payload with a unique sub (subject) to simulate a user
        test_user_id = f"user_{uuid.uuid4()}"
        payload = {
            "sub": test_user_id,
            "email": f"{test_user_id}@example.com",
            "exp": int(datetime.now().timestamp()) + 3600,
            "iat": int(datetime.now().timestamp())
        }
        payload_json = json.dumps(payload).encode()
        payload_b64 = base64.urlsafe_b64encode(payload_json).decode().rstrip("=")
        
        # Create a mock signature (not actually used for verification in our test)
        signature = base64.urlsafe_b64encode(b"test_signature").decode().rstrip("=")
        
        # Combine to form a JWT token
        token = f"{header_b64}.{payload_b64}.{signature}"
        return token

    def setUp(self):
        """Set up for each test"""
        self.token = self.mock_token
        print(f"\n🔍 Running test: {self._testMethodName}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Helper method to make API requests"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            # Print response details for debugging
            print(f"📡 {method} {url}")
            print(f"🔢 Status: {response.status_code}")
            
            try:
                response_data = response.json()
                print(f"📄 Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"📄 Response: {response.text}")
            
            # Assert the expected status code
            self.assertEqual(response.status_code, expected_status, 
                            f"Expected status {expected_status}, got {response.status_code}")
            
            return response
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            self.fail(f"Request failed: {str(e)}")
    
    def test_01_api_root(self):
        """Test the API root endpoint"""
        response = self.make_request('GET', "", expected_status=200)
        data = response.json()
        self.assertIn('message', data)
        print("✅ API root endpoint working")
    
    def test_02_user_sync(self):
        """Test user sync with backend"""
        response = self.make_request('POST', "auth/sync", data={}, expected_status=200)
        data = response.json()
        self.assertIn('user', data)
        self.user_id = data['user']['id']
        print(f"✅ User sync successful, user_id: {self.user_id}")
        print(f"✅ Token used: {self.token}")
        
        # Print the decoded token payload for debugging
        import base64
        import json
        
        try:
            # Split the token and decode the payload
            parts = self.token.split('.')
            if len(parts) == 3:
                # Decode the payload (middle part)
                payload_part = parts[1]
                # Add padding if needed for base64 decoding
                payload_part += '=' * (-len(payload_part) % 4)
                decoded = base64.urlsafe_b64decode(payload_part)
                payload = json.loads(decoded)
                print(f"✅ Token payload: {json.dumps(payload, indent=2)}")
        except Exception as e:
            print(f"❌ Error decoding token: {str(e)}")
    
    def test_03_get_me(self):
        """Test getting current user info"""
        response = self.make_request('GET', "me", expected_status=200)
        data = response.json()
        self.assertEqual(data['id'], self.user_id)
        print("✅ Get current user info successful")
    
    def test_04_create_post(self):
        """Test creating a new post"""
        post_data = {
            "content": "This is a test post created by the API tester",
            "tag": "Human2Human"
        }
        response = self.make_request('POST', "posts", data=post_data, expected_status=200)
        data = response.json()
        self.assertIn('post_id', data)
        self.post_id = data['post_id']
        print(f"✅ Post created successfully, post_id: {self.post_id}")
    
    def test_05_get_feed(self):
        """Test getting the daily feed"""
        response = self.make_request('GET', "feed", expected_status=200)
        data = response.json()
        self.assertIsInstance(data, list)
        print(f"✅ Feed retrieved successfully, {len(data)} posts in feed")
    
    def test_06_get_pending_posts(self):
        """Test getting pending posts (requires moderator role)"""
        # This might fail if the test user doesn't have moderator privileges
        response = self.make_request('GET', "posts/pending", expected_status=403)
        print("✅ Pending posts access check working (expected 403 for non-moderator)")
    
    def test_07_post_interaction(self):
        """Test post interaction (resonate and cherish)"""
        if self.post_id:
            # Test resonating with a post
            response = self.make_request('POST', f"posts/{self.post_id}/resonate", data={}, expected_status=200)
            print("✅ Resonate with post successful")
            
            # Test cherishing a post
            response = self.make_request('POST', f"posts/{self.post_id}/cherish", data={}, expected_status=200)
            print("✅ Cherish post successful")
        else:
            print("⚠️ Skipping post interaction test as no post was created")

if __name__ == "__main__":
    # Run the tests in order
    test_suite = unittest.TestSuite()
    test_suite.addTest(NotByAIAPITester('test_01_api_root'))
    test_suite.addTest(NotByAIAPITester('test_02_user_sync'))
    test_suite.addTest(NotByAIAPITester('test_03_get_me'))
    test_suite.addTest(NotByAIAPITester('test_04_create_post'))
    test_suite.addTest(NotByAIAPITester('test_05_get_feed'))
    test_suite.addTest(NotByAIAPITester('test_06_get_pending_posts'))
    test_suite.addTest(NotByAIAPITester('test_07_post_interaction'))
    
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite)