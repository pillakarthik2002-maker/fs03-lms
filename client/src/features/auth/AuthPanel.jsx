import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, logout, registerUser } from "./authSlice.js";

function AuthPanel() {
  const dispatch = useDispatch();
  const { user, status, error } = useSelector((state) => state.auth);

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    try {
      if (isRegistering) {
        await dispatch(registerUser({ name, email, password })).unwrap();
      }

      await dispatch(loginUser({ email, password })).unwrap();
    } catch (message) {
      setFormError(
        typeof message === "string" ? message : "Could not sign in. Please try again."
      );
    }
  }

  if (user) {
    return (
      <section>
        <p>
          Signed in as {user.name} ({user.role})
        </p>
        <button onClick={() => dispatch(logout())}>Sign out</button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <h2>{isRegistering ? "Create a student account" : "Sign in"}</h2>

      <form className="auth-form" onSubmit={handleSubmit}>
        {isRegistering && (
          <p>
            <label>
              Name{" "}
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          </p>
        )}

        <p>
          <label>
            Email{" "}
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        </p>

        <p>
          <label>
            Password{" "}
            <input
              type="password"
              required
              minLength="8"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </p>

        <button type="submit" disabled={status === "loading"}>
          {status === "loading"
            ? "Please wait…"
            : isRegistering
              ? "Register"
              : "Sign in"}
        </button>
      </form>

      {(formError || error) && <p role="alert">{formError || error}</p>}

      <button
        type="button"
        onClick={() => {
          setFormError("");
          setIsRegistering(!isRegistering);
        }}
      >
        {isRegistering ? "I already have an account" : "Create a student account"}
      </button>
    </section>
  );
}

export default AuthPanel;