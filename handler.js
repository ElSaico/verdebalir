import cheerio from "cheerio";
import request from "request-promise";
import zipObject from "lodash.zipobject";

const stockUrl = "http://www.fundamentus.com.br/detalhes.php";

const responseError = (context, err, message) => {
  const body = { message: message, stacktrace: err };
  context.log.error(message);
  context.log.error(err);
  context.res = { status: 500, body: JSON.stringify(body) };
};

const tickerListOptions = {
  uri: stockUrl,
  transform: body => {
    const $ = cheerio.load(body);
    return $(".resultado td a")
      .map((_, a) => $(a).text())
      .get();
  }
};

const parseIndicators = body => {
  const $ = cheerio.load(body);
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
};

export const getStocks = async context => {
  context.log("Fetching list of stock tickers...");

  let tickers;
  try {
    tickers = await request(tickerListOptions);
  } catch (err) {
    responseError(context, err, "Failure on obtaining stock tickers!");
    return;
  }

  tickers.map(async ticker => {
    let indicators;
    try {
      indicators = await request({
        uri: stockUrl,
        qs: { papel: ticker },
        transform: parseIndicators
      });
      context.log(indicators);
    } catch (err) {
      responseError(
        context,
        err,
        "Failure on obtaining indicators for stock " + ticker
      );
    }
  });
};
