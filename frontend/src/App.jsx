import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Guardias from "./pages/Guardias";
import Publicaciones from "./pages/Publicaciones";
import Pacientes from "./pages/Pacientes";
import Clinicas from "./pages/Clinicas";
import Trabajadores from "./pages/Trabajadores";
import Calendario from "./pages/Calendario";
import Nomina from "./pages/Nomina";
import Manual from "./pages/Manual";
import ManualTecnico from "./pages/ManualTecnico";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<Login />} />

                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/inicio" element={<Inicio />} />
                            <Route path="/guardias" element={<Guardias />} />
                            <Route
                                path="/publicaciones"
                                element={<Publicaciones />}
                            />
                            <Route path="/calendario" element={<Calendario />} />
                            <Route path="/nomina" element={<Nomina />} />
                            <Route path="/manual" element={<Manual />} />

                            <Route
                                element={
                                    <ProtectedRoute
                                        roles={["admin", "coordinador"]}
                                    />
                                }
                            >
                                <Route
                                    path="/pacientes"
                                    element={<Pacientes />}
                                />
                                <Route
                                    path="/trabajadores"
                                    element={<Trabajadores />}
                                />
                                <Route
                                    path="/clinicas"
                                    element={<Clinicas />}
                                />
                            </Route>

                            <Route element={<ProtectedRoute roles={["admin"]} />}>
                                <Route
                                    path="/manual-tecnico"
                                    element={<ManualTecnico />}
                                />
                            </Route>
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
