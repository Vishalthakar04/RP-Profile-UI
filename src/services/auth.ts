const BASE_URL = "https://rk-mission-be-2.onrender.com/api/rp/auth";
const PROFILE_URL = "https://rk-mission-be-2.onrender.com/api/rp";

export const requestOtp = async (identifier: string) => {
  const response = await fetch(`${BASE_URL}/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  return response.json();
};

export const verifyOtp = async (identifier: string, otp: string) => {
  const response = await fetch(`${BASE_URL}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, otp }),
  });
  return response.json();
};

export const fetchProfile = async (rowid: string) => {
  const response = await fetch(`${PROFILE_URL}/profile?rowid=${rowid}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};