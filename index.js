const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const mysql = require("mysql");
const bodyParser = require("body-parser");
require("dotenv").config();

let corsOptions = {
  origin: "*", // 출처 허용 옵션
  credentials: true // 사용자 인증이 필요한 리소스(쿠키 등) 접근
};

const app = express();
const PORT = process.env.PORT || 8008;

const RIOT_API_KEY = process.env.RIOT_API_KEY; // Riot API 키 사용
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

app.use(cors()); // CORS 미들웨어 추가
app.use(express.json());
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  const sqlQuery = `SELECT * FROM BOARD;`;
  db.query(sqlQuery, (err, result) => {
    if (err) {
      throw err;
    }
    res.send(result);
  });
});

app.get("/list", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;
  const sqlQuery = `SELECT BOARD_ID, BOARD_TITLE, REGISTER_ID, REGISTER_DATETIME FROM BOARD LIMIT ?, ?;`;
  db.query(sqlQuery, [offset, pageSize], (err, result) => {
    if (err) {
      throw err;
    }
    res.send(result);
  });
});

app.post("/insert", (req, res) => {
  let title = req.body.title;
  let content = req.body.content;

  // 이 부분은 redet_id 컬럼을 기본값으로 설정하는 쿼리입니다.
  // 만약 AUTO_INCREMENT로 설정되어 있다면, 아래 코드는 필요하지 않을 수 있습니다.
  const alterTableQuery = `ALTER TABLE BOARD MODIFY COLUMN redet_id INT DEFAULT 0;`;
  db.query(alterTableQuery, (alterErr, alterResult) => {
    if (alterErr) {
      throw alterErr;
    }

    // BOARD 테이블에 데이터 삽입하는 쿼리
    const sqlQuery = `INSERT INTO BOARD (BOARD_TITLE, BOARD_CONTENT, REGISTER_ID) VALUES (?, ?, 'happyDay');`;
    db.query(sqlQuery, [title, content], (err, result) => {
      if (err) {
        throw err;
      }
      res.send(result);
    });
  });
});

app.put("/update/:id", (req, res) => {
  let title = req.body.title;
  let content = req.body.content;
  let id = req.params.id;

  const sqlQuery = `UPDATE BOARD SET BOARD_TITLE=?, BOARD_CONTENT=? WHERE BOARD_ID = ?;`;
  db.query(sqlQuery, [title, content, id], (err, result) => {
    if (err) {
      throw err;
    }
    res.send(result);
  });
});

app.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sqlQuery = `DELETE FROM BOARD WHERE BOARD_ID = ${id};`;
  db.query(sqlQuery, (err, result) => {
    if (err) {
      console.error("Error deleting post:", err);
      console.log("none server");
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    console.log("Post deleted successfully");
    console.log("none end");
    res.json({ message: "Post deleted successfully" });
  });
});

app.post("/detail", (req, res) => {
  const id = req.body.boardIdList;
  const sqlQuery = `SELECT BOARD_TITLE, BOARD_CONTENT FROM BOARD WHERE BOARD_ID=${id}`;

  db.query(sqlQuery, (err, result) => {
    if (err) {
      throw err;
    }
    res.send(result);
  });
});

// cr clear
app.post("/redet", (req, res) => {
  const id = req.body.id;
  const redet = req.body.redet;

  const sqlQuery = `INSERT INTO redet (redet_content, BOARD_ID) VALUES (?, ?);`;

  db.query(sqlQuery, [redet, id], (err, result) => {
    if (err) {
      throw err;
    }
    res.send(result);
  });
});

app.post("/comment", (req, res) => {
  const id = req.body.boardIdList;
  const sqlQuery = `SELECT redet_id, redet_content FROM redet WHERE BOARD_ID=${id};`;

  db.query(sqlQuery, (err, result) => {
    if (err) {
      throw err;
    }
    res.send(result);
  });
});

app.delete("/redet/:id", (req, res) => {
  const redetId = req.params.id;
  const sqlQuery = `DELETE FROM redet WHERE redet_id = ?;`;

  db.query(sqlQuery, [redetId], (err, result) => {
    if (err) {
      console.error("Error deleting comment:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    console.log("Comment deleted successfully");
    res.json({ message: "Comment deleted successfully" });
  });
});

app.get(
  "/riot/account/v1/accounts/by-riot-id/:gameName/:tagline",
  async (req, res) => {
    try {
      const { gameName, tagline } = req.params;
      console.log(gameName, tagline);
      const riotApiUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagline}`;
      const response = await axios.get(riotApiUrl, {
        headers: {
          "X-Riot-Token": RIOT_API_KEY
        }
      });

      res.json(response.data);
    } catch (error) {
      console.error("error in proxy name & tag : ", error);
      res.status(500).json({ error: "proxy Server name & tag error" });
    }
  }
);

app.get("/lol/summoner/v4/summoners/by-puuid/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const riotApiUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const response = await axios.get(riotApiUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error in proxy:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/riot/account/v1/accounts/by-puuid/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const riotApiUrl = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
    const response = await axios.get(riotApiUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error in prosy Tag :", error);
    res.status(500).json({ error: "TagError" });
  }
});

app.get("/lol/league/v4/entries/by-summoner/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const riotApiUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}`;
    const response = await axios.get(riotApiUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });

    res.json(response.data[0]);
  } catch (error) {
    console.error("Error in prosy rankdata :", error);
    res.status(500).json({ error: "rankdata" });
  }
});

app.get("/lol/match/v5/matches/by-puuid/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const { start, count } = req.query;
    const riotApiUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
    const response = await axios.get(riotApiUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error in prosy matchdata : ", error);
    res.status(500).json({ error: "matchdata" });
  }
});

app.get("/lol/match/v5/matches/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const riotApiUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    const response = await axios.get(riotApiUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error in prosy matchInfodata : ", error);
    res.status(500).json({ error: "matchInfodata" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});
