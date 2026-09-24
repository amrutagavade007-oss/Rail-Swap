function joinJourney() {
    window.location.href = "register.html";
}


// ===============================
// REGISTER
// ===============================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const message = document.getElementById("message");

        try {

            const response = await fetch(
                "http://localhost:3000/api/auth/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {

                message.textContent = data.message;

                registerForm.reset();

            } else {

                message.textContent = data.message;
            }

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to connect to RailSwap server.";
        }
    });
}


// ===============================
// LOGIN
// ===============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const message = document.getElementById("message");

        try {

            const response = await fetch(
                "http://localhost:3000/api/auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {

                message.textContent = data.message;

                // Store logged-in user information
                localStorage.setItem("user_id", data.user_id);
                localStorage.setItem("name", data.name);
                localStorage.setItem("email", data.email);

                // Go to dashboard
                setTimeout(function () {
                    window.location.href = "dashboard.html";
                }, 1000);

            } else {

                message.textContent = data.message;
            }

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to connect to RailSwap server.";
        }
    });
}