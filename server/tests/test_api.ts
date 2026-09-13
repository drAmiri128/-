/**
 * Automated Verification Script for STAGE 2
 * Tests Authentication, Authorization, Database CRUD, and Data Protection
 */

const BASE_URL = 'http://127.0.0.1:3000';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    results.push({ name, passed: true });
  } else {
    console.error(`❌ [FAIL] ${name} - ${details || ''}`);
    results.push({ name, passed: false, details });
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('🚀 RUNNING STAGE 2 BACKEND VERIFICATION');
  console.log('========================================\n');

  let controllerToken = '';
  let userToken = '';
  let testUserId = '';
  let testContentId = '';
  let testSubmissionId = '';

  // ----------------------------------------------------
  // 1. Authentication Tests
  // ----------------------------------------------------
  console.log('\n--- 1. Authentication Tests ---');

  // Test 1.1: Controller Login with correct password 'Mohammad128'
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/controller-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Mohammad128' }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true && !!data.data?.token,
      'Controller password صحیح → موفق',
      JSON.stringify(data)
    );
    controllerToken = data.data?.token;

    // Test 1.2: Password hash is NEVER in response
    const hasHash = JSON.stringify(data).includes('password_hash') || JSON.stringify(data).includes('$2');
    assert(
      !hasHash,
      'Password hash هرگز در response نباشد',
      'Found password hash or bcrypt signature in response!'
    );
  } catch (err: any) {
    assert(false, 'Controller password صحیح → موفق', err.message);
  }

  // Test 1.3: Controller Login with wrong password
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/controller-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'WrongPassword123' }),
    });
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false,
      'Controller password اشتباه → رد شود',
      `Status: ${res.status}`
    );
  } catch (err: any) {
    assert(false, 'Controller password اشتباه → رد شود', err.message);
  }

  // Test 1.4: User Onboarding / Registration
  try {
    const uniquePhone = `0912${Math.floor(1000000 + Math.random() * 9000000)}`;
    const res = await fetch(`${BASE_URL}/api/v1/auth/user-onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'زائر آزمایشی سامانه',
        phoneNumber: uniquePhone,
        email: `zaer-${Date.now()}@example.com`,
        age: '24',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 201 && data.success === true && !!data.data?.token,
      'ایجاد کاربر در Database و صدور توکن کاربری',
      JSON.stringify(data)
    );
    userToken = data.data?.token;
    testUserId = data.data?.account?.id;
  } catch (err: any) {
    assert(false, 'ایجاد کاربر در Database', err.message);
  }

  // Test 1.5: GET /api/v1/users/profile
  try {
    const res = await fetch(`${BASE_URL}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true && data.data?.name === 'زائر آزمایشی سامانه',
      'GET /api/v1/users/profile دریافت اطلاعات کاربر جاری',
      JSON.stringify(data)
    );
  } catch (err: any) {
    assert(false, 'GET /api/v1/users/profile', err.message);
  }

  // ----------------------------------------------------
  // 2. Authorization Tests
  // ----------------------------------------------------
  console.log('\n--- 2. Authorization Tests ---');

  // Test 2.1: Controller → Admin API مجاز
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/content`, {
      headers: { Authorization: `Bearer ${controllerToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true && Array.isArray(data.data),
      'Controller → Admin API مجاز (Status 200)',
      `Status: ${res.status}`
    );
  } catch (err: any) {
    assert(false, 'Controller → Admin API مجاز', err.message);
  }

  // Test 2.2: User → Admin API غیرمجاز (403 Forbidden)
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/content`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.success === false,
      'User → Admin API غیرمجاز (Status 403 Forbidden)',
      `Status: ${res.status}, Message: ${data.message}`
    );
  } catch (err: any) {
    assert(false, 'User → Admin API غیرمجاز', err.message);
  }

  // Test 2.3: بدون Authentication → API محافظت‌شده غیرمجاز (401 Unauthorized)
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/content`);
    const data = await res.json();
    assert(
      res.status === 401 && data.success === false,
      'بدون Authentication → API محافظت‌شده غیرمجاز (Status 401 Unauthorized)',
      `Status: ${res.status}`
    );
  } catch (err: any) {
    assert(false, 'بدون Authentication → غیرمجاز', err.message);
  }

  // ----------------------------------------------------
  // 3. Database Operations (CRUD) Tests
  // ----------------------------------------------------
  console.log('\n--- 3. Database Operations Tests ---');

  // Test 3.1: Create Content via Controller
  try {
    testContentId = `test-item-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/v1/admin/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${controllerToken}`,
      },
      body: JSON.stringify({
        id: testContentId,
        type: 'multiple_choice',
        title: 'آزمون مرحله دوم تستی',
        content: 'سؤال تستی برای راستی‌آزمایی بک‌اند دیتابیس',
        category: 'تست سیستم',
        options: ['گزینه الف', 'گزینه ب', 'گزینه ج', 'گزینه د'],
        correctOptionIndex: 0,
        points: 10,
        isPublished: true,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 201 && data.success === true,
      'ایجاد Content توسط Controller در دیتابیس',
      JSON.stringify(data)
    );
  } catch (err: any) {
    assert(false, 'ایجاد Content در دیتابیس', err.message);
  }

  // Test 3.2: Create Submission
  try {
    testSubmissionId = `sub-test-${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/v1/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        id: testSubmissionId,
        userName: 'زائر آزمایشی سامانه',
        userEmailOrPhone: '09129990000',
        answers: {
          [testContentId]: {
            itemId: testContentId,
            itemType: 'multiple_choice',
            selectedOptionIndex: 0,
            isCorrect: true,
            scoreAwarded: 10,
            maxScore: 10,
            answeredAt: new Date().toISOString(),
          },
        },
        totalScore: 10,
        maxScore: 10,
      }),
    });
    const data = await res.json();
    assert(
      res.status === 201 && data.success === true,
      'ایجاد Submission در دیتابیس توسط کاربر',
      JSON.stringify(data)
    );
  } catch (err: any) {
    assert(false, 'ایجاد Submission در دیتابیس', err.message);
  }

  // Test 3.3: Evaluate Submission by Controller
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/submissions/${testSubmissionId}/evaluate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${controllerToken}`,
      },
      body: JSON.stringify({
        totalScore: 10,
        feedback: 'پاسخ عالی و صحیح است.',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true,
      'ارزیابی و نمره‌دهی Submission توسط Controller',
      JSON.stringify(data)
    );
  } catch (err: any) {
    assert(false, 'ارزیابی Submission توسط Controller', err.message);
  }

  // Test 3.4: Update Settings & Matam Mode
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/settings/matam-mode`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${controllerToken}`,
      },
      body: JSON.stringify({ isMatamMode: true }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true && data.data?.isMatamMode === true,
      'تغییر Settings (حالت ماتم) در دیتابیس',
      JSON.stringify(data)
    );
  } catch (err: any) {
    assert(false, 'تغییر Settings در دیتابیس', err.message);
  }

  // Test 3.5: Vote in Poll
  try {
    const res = await fetch(`${BASE_URL}/api/v1/content/${testContentId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIndex: 0 }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true,
      'ثبت رای در POST /api/v1/content/:id/vote',
      JSON.stringify(data)
    );
  } catch (err: any) {
    assert(false, 'ثبت رای در poll', err.message);
  }

  // Cleanup test content item
  try {
    await fetch(`${BASE_URL}/api/v1/admin/content/${testContentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${controllerToken}` },
    });
  } catch {
    // ignore cleanup
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n========================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL STAGE 2 TESTS PASSED PERFECTLY!\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
