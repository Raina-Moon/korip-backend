import "./jobs/cron";
import "./jobs/cleanUpInactiveUsers";
import "./jobs/ticket-cron";

import app from "./app";

const port = Number(process.env.PORT) || 5001;
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Listening: http://${host}:${port}`); // 로그도 host 반영
});
