import 'dotenv/config';
import express, { Request, Response } from "express";
import cors from "cors";
import { AddressInfo } from "net";
import connection from "./connection";
import bcrypt from 'bcryptjs';
import { generateToken } from './services/authenticator';
import { User, UserRole } from './services/types';
import { verificarToken } from './services/verify';

const app = express();

app.use(express.json());
app.use(cors());

// Endpoint para login no sistema
app.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(401).json({ error: 'Parâmetros incorretos' });
  }
  try {
    const user = await connection('users').where('NAME_USER', username).first();
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const isValidPassword = await bcrypt.compare(password, user.PASSKEY);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const userPayload: User = {
      id: user.ID_USER,
      nameUser: user.NAME_USER,
      address: user.ADDRESS,
      passkey: user.PASSKEY,
      roleUser: user.ROLE_USER as UserRole,
      tokenAuth: user.TOKEN_AUTH
    };

    const token = generateToken(userPayload);

    res.status(200).json({ token });
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// Endpoint para listar todas as partidas
app.get("/matches", verificarToken, async (req: Request, res: Response) => {
  try {
    const matches = await connection.select().from("MATCHES");
    res.status(200).json(matches);
  } catch (error) {
    console.error("Erro ao listar as partidas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para adicionar uma nova partida
app.post("/new-matches", verificarToken, async (req: Request, res: Response) => {
  try {
    const { pastMatch, currMatch, nextMatch } = req.body;

    if (!pastMatch || !currMatch || !nextMatch) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const [newMatch] = await connection('MATCHES').insert({ PAST_MATCH: pastMatch, CURR_MATCH: currMatch, NEXT_MATCH: nextMatch }).returning('*');

    res.status(201).json({ message: "Nova partida adicionada com sucesso!", match: newMatch });
  } catch (error) {
    console.error("Erro ao adicionar nova partida:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});


// Endpoint para atualizar informações de jogadores
app.put("/players/:id", verificarToken, async (req: Request, res: Response) => {
  const playerId = req.params.id;
  const { name, num, position, teamId } = req.body;

  try {
    await connection('PLAYER').where('ID_PLAYER', playerId).update({ NAME_PLAYER: name, NUM_PLAYER: num, POSITION_PLAYER: position, ID_TEAM: teamId });

    res.status(200).json({ message: "Informações do jogador atualizadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar informações do jogador:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para deletar um time da base de dados
app.delete("/teams/:id", verificarToken, async (req: Request, res: Response) => {
  const teamId = req.params.id;
  try {
    await connection('TEAMS').where('ID_TEAM', teamId).del();

    res.status(200).json({ message: "Time deletado com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar time:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Endpoint para atualizar o logo de um time
app.put("/teams/:id/motto", verificarToken, async (req: Request, res: Response) => {
  const teamId = req.params.id;
  const newMotto = req.body.Motto;

  try {
    const teamExists = await connection.select().from("TEAMS").where("ID_TEAM", teamId).first();
    if (!teamExists) {
      return res.status(404).json({ error: "Time não encontrado" });
    }

    await connection("TEAMS").where("ID_TEAM", teamId).update("MOTTO_TEAM", newMotto);

    res.status(200).json({ message: "Logo do time atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar logo do time:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});


const server = app.listen(process.env.PORT || 3003, () => {
  if (server) {
    const address = server.address() as AddressInfo;
    console.log(`Server is running in http://localhost:3003`);
  } else {
    console.error(`Failure upon starting server.`);
  }
});
