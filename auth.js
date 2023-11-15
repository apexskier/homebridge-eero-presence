// eslint-disable-next-line @typescript-eslint/no-var-requires
const readline = require("readline");

function read(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, function (response) {
      resolve(response);
      rl.close();
    });
  });
}

async function main() {
  let response = await fetch("https://api-user.e2ro.com/2.2/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      login: await read(
        "login identifier (email or phone, amazon login not supported): ",
      ),
    }),
  });
  if (!response.ok) {
    throw new Error("failed to send login request");
  }
  if (response.status !== 200) {
    throw new Error(`failed to make login request: ${response.status}`);
  }

  const {
    data: { user_token },
  } = await response.json();

  response = await fetch("https://api-user.e2ro.com/2.2/login/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `s=${user_token}`,
    },
    body: JSON.stringify({ code: await read("verification code: ") }),
  });
  if (!response.ok) {
    throw new Error("failed to send verification request");
  }
  if (response.status !== 200) {
    throw new Error(`failed to make verification request: ${response.status}`);
  }

  process.stdout.write(`user token: ${user_token}\n`);
}

main();
