import cheerio from "cheerio";
import { RxHR } from "@akanass/rx-http-request";

const stockUrl = "http://www.fundamentus.com.br/detalhes.php";

const responseError = (context, err, message) => {
  const body = { message: message, stacktrace: err };
  context.log.error(message);
  context.log.error(err);
  context.res = { status: 500, body: JSON.stringify(body) };
};

export const getStocks = async context => {
  context.log("Fetching list of stock tickers...");

  RxHR.get(stockUrl).subscribe(
    data => {
      const $ = cheerio.load(data);
      return $(".resultado td a")
        .map((_, a) => $(a).text())
        .get();
    },
    err => {
      responseError(context, err, "Failure on obtaining stock tickers!");
    }
  );

  tickers.map(ticker => {
    context.log(`Fetching indicators for stock ${ticker}...`);
    RxHR.get(stockUrl, { qs: { papel: ticker } }).subscribe(
      data => {
        const $ = cheerio.load(data);
        const table = $(".conteudo table:nth-of-type(3)");
        const labels = table
          .find("td.label:nth-child(n+2) .txt")
          .map((_, cell) => $(cell).text())
          .get();
        const values = table
          .find("td.data:nth-child(n+3) .txt")
          .map((_, cell) =>
            $(cell)
              .text()
              .trim()
          )
          .get();
        return zipObject(labels, values);
      },
      _ => {
        context.log.error(
          `Failure on obtaining indicators for stock ${ticker}`
        );
      }
    );
  });

  context.res = { body: JSON.stringify(tickers) };
};
