export const hello = context => {
  context.log("JavaScript HTTP trigger function processed a request.");

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: "Go Serverless v1.x! Your function executed successfully!"
  };

  context.done();
};
