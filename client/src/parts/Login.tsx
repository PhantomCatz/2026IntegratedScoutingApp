import "../public/stylesheets/login.css";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getScoutNameCookie, setScoutNameCookie } from "../lib/scoutCookie";

const LOGIN_PASSWORD = "1111";

export function Login() {
	const navigate = useNavigate();
	const [name, setName] = useState(() => getScoutNameCookie());
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (name.trim().length < 2) {
			setError("please type in your name");
			return;
		}

		if (password !== LOGIN_PASSWORD) {
			setError("Incorrect password");
			return;
		}

		setError("");
		const scoutName = name.trim();
		sessionStorage.setItem("signedIn", "1");
		sessionStorage.setItem("scoutName", scoutName);
		setScoutNameCookie(scoutName);
		navigate("/");
	};

	return (
		<main className="loginPage">
			<form onSubmit={handleSubmit} className="loginForm">
				<h1>Strategy App</h1>

				<label>
					Name
					<input
						type="text"
						name="name"
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setError("");
						}}
						autoComplete="username"
					/>
				</label>

				<label>
					Password
					<input
						type="password"
						name="password"
						value={password}
						onChange={(event) => {
							setPassword(event.target.value);
							setError("");
						}}
						autoComplete="current-password"
					/>
				</label>

				{error ? <p className="loginError">{error}</p> : null}

				<button type="submit">Sign In</button>
			</form>
		</main>
	);
}
