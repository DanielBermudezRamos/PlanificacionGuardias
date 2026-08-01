const jwt = require("jsonwebtoken");

module.exports = function(req,res,next){

    const token = req.headers.authorization;

    if(!token){

        return res.status(401).json({
            error:"Token requerido"
        });

    }

    try{

        const decoded = jwt.verify(
            token,
            "CLAVE_SECRETA_PERMED"
        );

        req.usuario = decoded;

        next();

    }catch(error){

        res.status(401).json({
            error:"Token inválido"
        });

    }

}