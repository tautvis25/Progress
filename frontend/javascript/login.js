const apiBase = "/"; 
const submitButton = document.getElementById("submit");
const error = document.getElementById("error");
let isAuthenticating = false;

async function loginUser() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (isAuthenticating || !username || !password) {
        error.textContent = "Please enter both username and password.";
        error.style.display = "block";
        return;
    }

    error.style.display = "none";
    isAuthenticating = true;
    submitButton.disabled = true;

    try {
        const response = await fetch(apiBase + "auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            credentials: "include" 
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Login failed");

        localStorage.setItem("accessToken", data.accessToken);

        window.location.href = "/app.html";

    } catch (err) {
        error.textContent = err.message;
        error.style.display = "block";
        console.error(err);
    } finally {
        isAuthenticating = false;
        submitButton.disabled = false;
    }
}


document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    loginUser();
});
