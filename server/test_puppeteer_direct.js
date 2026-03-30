import puppeteer from "puppeteer-core";

(async () => {
  try {
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!executablePath) {
      try {
        executablePath = puppeteer.executablePath();
      } catch (e) {
        executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
      }
    }
    console.log("Using executablePath:", executablePath);

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote'
      ]
    });

    console.log("Browser launched");
    const page = await browser.newPage();
    console.log("Page created");
    await browser.close();
    console.log("Success");
  } catch (err) {
    console.error("Puppeteer crashed:", err);
  }
})();
