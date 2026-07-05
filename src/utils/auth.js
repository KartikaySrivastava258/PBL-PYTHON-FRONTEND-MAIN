export function saveToken(token, userDetails) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(userDetails));
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUserRole() {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.role || null;
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
}
