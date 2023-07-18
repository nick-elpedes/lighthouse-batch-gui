import express from "express";
import {fileURLToPath} from "url";
import path from "path";
import cors from "cors";
import chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import * as constants from "lighthouse/core/config/constants.js";
import fs from "fs";
import {v4 as uuidv4} from "uuid";
import Papa from "papaparse";
import formidable from "formidable";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {router as indexRouter} from "./routes/index.mjs";
import {router as reportsRouter} from "./routes/reports.mjs";
/* import {router as sseRouter} from "./routes/sse.mjs"; */

const port = 3000;
var user = {};
var app = express();
app.use(cors());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "report")));
app.use("/sse", async function (req, res) {
  res.set({
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
  });
  res.flushHeaders();

  res.write("retry: 10000\n\n");

  user = {res};

  res.on("close", () => {
    res.end();
  });
});

app.post("/reports/generate", async function (req, res, next) {
  const form = formidable({uploadDir: path.join(__dirname, "uploads/csv")});
  const [fields, files] = await form.parse(req);
  /* console.log(fields);
  console.log(files); */

  const singleUrl = fields.url ? fields.url[0] : null;
  const csv = files.csvFile[0]
    ? "/uploads/csv/" + files.csvFile[0].newFilename
    : null;

  res.render("reports/results", {
    title: "Report Results",
    emulationMode: fields.emulationMode ? "Mobile" : "Desktop",
  });

  await (async () => {
    console.log("waiting for user");
    while (!user.res)
      // define the condition as you like
      await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("user is defined");
    /* console.log(user.res); */
  })();

  if (!singleUrl && csv) {
    const csvFile = fs.readFileSync(path.join(__dirname, csv), "utf8");
    fs.unlinkSync(path.join(__dirname, csv));

    const rows = Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
    });

    var currentIndex = 0;
    for (const row of rows.data) {
      currentIndex++;
      /* console.log(user); */

      user.res.write(
        `data: ${JSON.stringify({
          reportData: {
            reportCount: `Report ${currentIndex} of ${rows.data.length}`,
            currentReport: `Generating Report for ${row["URL"]}`,
          },
        })}\n\n`
      );

      const results = await generateLighthouseReport(
        row["URL"],
        fields.emulationMode == "on" ? false : true
      );

      const fileId = uuidv4();
      await generateReportFiles(results, fileId);
      results.fileId = fileId;
      results.title = row["Title"];
      results.url = row["URL"];

      user.res.write(`data: ${JSON.stringify(results)}\n\n`);
    }

    user.res.write(
      `data: ${JSON.stringify({
        reportData: {
          reportCount: `${rows.data.length} Reports`,
          currentReport: `All Reports Generated`,
        },
      })}\n\n`
    );

  } else {
    console.log(singleUrl);

    user.res.write(
      `data: ${JSON.stringify({
        reportData: {
          reportCount: `Single Report`,
          currentReport: `Generating Report for ${singleUrl}`,
        },
      })}\n\n`
    );

    const results = await generateLighthouseReport(
      singleUrl,
      fields.emulationMode == "on" ? false : true
    );
    console.log("after generateLighthouseReport");
    const fileId = uuidv4();
    await generateReportFiles(results, fileId);
    results.fileId = fileId;
    results.url = singleUrl;
    results.title = "Not supported for Single Urls";

    user.res.write(`data: ${JSON.stringify(results)}\n\n`);

    user.res.write(
      `data: ${JSON.stringify({
        reportData: {
          reportCount: `Single Report`,
          currentReport: "Finished",
        },
      })}\n\n`
    );
  }

  /*   for (const url of urls) {
    console.log(url);
    const results = await generateLighthouseReport(
      url,
      fields.emulationMode == "on" ? false : true
    );
    console.log("after generateLighthouseReport");
    const fileId = uuidv4();
    await generateReportFiles(results, fileId);
    results.fileId = fileId;

    user.res.write(`data: ${JSON.stringify(results)}\n\n`);
  } */
});

app.use("/reports", reportsRouter);
app.use("/", indexRouter);

async function generateLighthouseReport(
  url,
  desktop,
  opts = {logLevel: "info"}
) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless"],
  });
  opts.port = chrome.port;

  const results = await lighthouse(url, opts, {
    extends: "lighthouse:default",
    settings: {
      output: ["json", "html"],
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: "desktop",
      throttling: constants.throttling.desktopDense4G,
      screenEmulation: constants.screenEmulationMetrics.desktop,
      emulatedUserAgent: constants.userAgents.desktop,
    },
  });

  await chrome.kill();
  return results;
}

async function generateReportFiles(results, fileId) {
  await fs.writeFile(
    `./report/lighthouse/${fileId}.json`,
    results.report[0],
    {flag: "w+"},
    (err) => {
      console.log(err);
    }
  );
  await fs.writeFile(
    `./report/lighthouse/${fileId}.html`,
    results.report[1],
    {flag: "w+"},
    (err) => {
      console.log(err);
    }
  );
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
