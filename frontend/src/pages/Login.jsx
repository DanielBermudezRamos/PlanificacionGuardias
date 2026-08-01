import { useState } from "react";
import api from "../services/api";

function Login() {

const [email,setEmail] = useState("");
const [password,setPassword] = useState("");

const login = async () => {
    const res = await api.post("/auth/login", {
        email,
        password
    });

    localStorage.setItem("token",res.data.token);

};

return (
    <div>
        <h2>Login PERMED</h2>

        <input placeholder="Email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
        />
        <input type="password"
            placeholder="Contraseña"
            value={password}
            onChange = {
                e=>setPassword(e.target.value)
            }
        />
        <button onClick={login}>Ingresar</button>

    </div>
);

}

export default Login;