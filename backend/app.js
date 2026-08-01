const express = require("express");
const cors = require("cors");

const pacientesRoutes = require("./routes/pacientes.routes.js");
const prestadoresRoutes = require("./routes/prestadores.routes.js");
const guardiasRoutes = require("./routes/guardias.routes");
const reemplazosRoutes = require("./routes/reemplazos.routes");
const asistenciaRoutes = require("./routes/asistencia.routes");
const nominaRoutes = require("./routes/nomina.routes");
const calendarioRoutes = require("./routes/calendario.routes");
const asignacionesRoutes = require("./routes/asignaciones.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/prestadores", prestadoresRoutes);
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/guardias", guardiasRoutes);
app.use("/api/reemplazos", reemplazosRoutes);
app.use("/api/asistencia", asistenciaRoutes);
app.use("/api/nomina", nominaRoutes);
app.use("/api/calendario", calendarioRoutes);
app.use("/api/asignaciones",asignacionesRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({ mensaje: "API PERMED funcionando" });
});

const PORT = 3000;

/*
const bcrypt = require("bcryptjs");
bcrypt.hash("123456",10).then(console.log); 
// */


app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});