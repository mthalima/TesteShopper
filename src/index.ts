import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

const db = require("./database");

dotenv.config(); // Load environment variables from a .env file
const app = express();
// Middlewares
app.use(cors());
app.use(express.json());
const apiKey = process.env.GOOGLE_API_KEY;

// ROTAS DA API >>>>>>>>>>>>>>>>>>>>>>>>>>>

// ROTA PARA SERVIR OS MOTORISTAS SALVOS NO BANCO DE DADOS SQLITE
app.get("/drivers", (req: Request, res: Response) => {
  db.all("SELECT * FROM drivers", [], (err: any, rows: any) => {
    if (err) {
      res.status(500).json({ error: "Erro ao buscar motoristas" });
    } else {
      res.json(rows);
    }
  });
});

// Fetch drivers from the /drivers endpoint and save them in the drivers array

let drivers: any[] = [];

axios
  .get("http://localhost:8080/drivers")
  .then((response) => {
    drivers = response.data;
  })
  .catch((error) => {
    console.error("Error fetching drivers:", error);
  });

// ROTA PRINCIPAL DA API>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
app.post(
  "/ride/estimate",
  async (req: Request, res: Response, next: NextFunction) => {
    const { customer_id, origin, destination } = req.body;
    console.log("Request body:", req.body);

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;
    const urlRota = "https://maps.googleapis.com/maps/api/directions/json";

    console.log("URL:", url);
    //validação dos campos
    if (!origin || !destination || !customer_id) {
      res.status(400).json({ message: "Origem e destino são obrigatórios." });
      return;
    }

    //validação de origem e destino iguais
    if (origin === destination) {
      res
        .status(400)
        .json({ message: "Origem e destino não podem ser iguais." });
      return;
    }

    //TENTA CONECTAR COM A API DO GOOGLE
    try {
      const googleResponse = await axios.get(urlRota, {
        params: {
          origin,
          destination,
          key: apiKey,
        },
      });
      console.log("Google Response:", googleResponse.data);
      if (googleResponse.data.status !== "OK") {
        res.status(400).json({
          errorCode: "INVALID_DATA",
          error_description:
            "Os dados fornecidos no corpo da Requisição são invalidos",
        });
        return;
      }

      //dados da api do google
      const directions = googleResponse.data;
      const origem = directions.routes[0].legs[0].start_address;
      const destino = directions.routes[0].legs[0].end_address;
      const distancia = directions.routes[0].legs[0].distance.text;
      const kmDistancia = directions.routes[0].legs[0].distance.value / 1000;
      const duracao = directions.routes[0].legs[0].duration.text;
      const originLat = directions.routes[0].legs[0].start_location.lat;
      const originLng = directions.routes[0].legs[0].start_location.lng;
      const destinationLat = directions.routes[0].legs[0].end_location.lat;
      const destinationLng = directions.routes[0].legs[0].end_location.lng;

      //RESPOSTA DA API PARA O FRONTEND

      res.status(200).json({
        customer_id: customer_id,
        origin: {
          latitude: originLat,
          longitude: originLng,
        },
        destination: {
          latitude: destinationLat,
          longitude: destinationLng,
        },
        distance: distancia,
        duration: duracao,
        options: {
          drivers: drivers.map((driver) => ({
            id: driver.id,
            name: driver.name,
            description: driver.description,
            vehicle: driver.vehicle,
            review: driver.review,
            taxa: driver.taxa,
            valor: driver.taxa * kmDistancia,
          })),
        },
        googleResponse: googleResponse.data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ROTA PARA CONFIRMAR A CORRIDA
app.patch("/ride/confirm", (req: Request, res: Response) => {
  const {
    customer_id,
    origin,
    destination,
    distance,
    duration,
    driver,
    value,
  } = req.body;
  console.log("Request body:", req.body);
  if (
    !customer_id ||
    !origin ||
    !destination ||
    !distance ||
    !duration ||
    !driver ||
    !value
  ) {
    //validação dos campos
    res.status(400).json({
      errorCode: "INVALID_DATA",
      error_description:
        "Os dados fornecidos no corpo da Requisição são invalidos",
    });

    //motorista nao encontrado
    res.status(404).json({
      error_code: "DRIVER_NOT_FOUND",
      error_description: "Motorista não encontrado",
    });

    //kilometragem minima nao atingida
    res.status(406).json({
      error_code: "INVALID_DISTANCE",
      error_description: "Distância mínima não atingida",
    });
  }

  //PERSISTE A CORRIDA NO BANCO DE DADOS SQLITE
  const query =
    "INSERT INTO rides (origin, destination, duration, driver_id, value) VALUES (?, ?, ?, ?, ?)";
  const values = [origin, destination, duration, driver.id, value];

  db.run(query, values, function (err: any) {
    if (err) {
      res.status(500).json({ error: "Erro ao atualizar a corrida" });
    } else {
      res.status(201).json({ message: "Corrida atualizada com sucesso" });
    }
  });
});

// ROTA PARA BUSCAR AS CORRIDAS SALVAS NO BANCO DE DADOS SQLITE
app.get("/rides/:id", (req: Request, res: Response) => {
  const rideId = req.params.id;
  const query = "SELECT * FROM rides WHERE id = ?";

  db.get(query, [rideId], (err: any, ride: any) => {
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }
    if (err) {
      res.status(500).json({ error: "Erro ao buscar corrida" });
    } else {
      res.json(ride);
    }
  });
});

// Iniciar o servidor
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Front end na porta 80, ou 3000!!!");
});
