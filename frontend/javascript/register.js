const apiBase = "/"; 
const submitButton = document.getElementById("submit");
const error = document.getElementById("error");
let isAuthenticating = false;

async function registerUser() {
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (isAuthenticating || !username || !email || !password || password.length < 6 || !email.includes("@")) {
        error.textContent = "Please fill all fields correctly (password ≥6 chars, valid email).";
        error.style.display = "block";
        return;
    }

    error.style.display = "none";
    isAuthenticating = true;
    submitButton.disabled = true;

    try {
        const response = await fetch(apiBase + "auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Registration failed");

        window.location.href = "/login.html";

    } catch (err) {
        error.textContent = err.message;
        error.style.display = "block";
        console.error(err);
    } finally {
        isAuthenticating = false;
        submitButton.disabled = false;
    }
}

document.getElementById("signup-form").addEventListener("submit", (e) => {
    e.preventDefault(); 
    registerUser();
});
