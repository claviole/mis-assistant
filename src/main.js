async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  if (!message) return;

  const chatbox = document.getElementById("chatbox");

  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.textContent = message;
  chatbox.appendChild(userDiv);

  const botDiv = document.createElement("div");
  botDiv.className = "message bot";
  botDiv.innerHTML = `<i>Thinking...</i>`;
  chatbox.appendChild(botDiv);

  input.value = "";
  chatbox.scrollTop = chatbox.scrollHeight;

  const rawReply = await callAssistantAPI(message);
  const htmlReply = formatReplyText(rawReply || "[No response]");

  // We can keep the automatic detection as it is
  if (
    rawReply &&
    (rawReply.toLowerCase().includes("i could not find") ||
      rawReply.toLowerCase().includes("i don't have information") ||
      rawReply.toLowerCase().includes("not trained on") ||
      rawReply.toLowerCase().includes("i don't know") ||
      rawReply.toLowerCase().includes("not found") ||
      rawReply.toLowerCase().includes("I'm sorry") ||
      rawReply.toLowerCase().includes("Unfortunately") ||
      rawReply.toLowerCase().includes("unable to find") ||
      rawReply.toLowerCase().includes("I couldn't find"))
  ) {
    // Log the unanswered question
    logUnansweredQuestion(message);
  }

  botDiv.innerHTML = "";
  await typeHtml(botDiv, htmlReply);

  // Add review link below the bot response
  const reviewLink = document.createElement("div");
  reviewLink.className = "review-link";
  reviewLink.innerHTML =
    "Was this answer helpful? <a href='#'>Submit this question for review</a> to improve the system.";
  reviewLink.querySelector("a").onclick = function (e) {
    e.preventDefault();
    logUnansweredQuestion(message);
    this.parentElement.innerHTML =
      "Thank you! Your question has been submitted for review.";
    this.parentElement.className = "review-link submitted";
  };

  // Add the review link after the bot message
  chatbox.insertBefore(reviewLink, botDiv.nextSibling);

  chatbox.scrollTop = chatbox.scrollHeight;
}

function cleanReply(text) {
  return text
    .replace(/<[^>]+>/g, "") // remove raw HTML
    .replace(/【\d+:\d+†[Ss]ource(?:\.file)?】/g, "") // full-width source tags with optional .file
    .replace(/\[\d+:\d+[†↑]?[Ss]ource(?:\.file)?\]/g, "") // square-bracket source tags
    .replace(/\(\d+:\d+[†↑]?[Ss]ource(?:\.file)?\)/g, "") // parenthesis source tags
    .replace(/[【\[\(]\d+:\d+.*?[】\]\)]/g, "") // catch any other citation format
    .replace(/\s{2,}/g, " ") // remove double spaces
    .trim();
}

function formatReplyText(text) {
  const cleaned = cleanReply(text);

  // Convert Markdown-style formatting into HTML
  let html = cleaned
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // bold
    .replace(/`([^`]+)`/g, "<code>$1</code>") // inline code
    .replace(/^#+\s?(.*)$/gm, "<h3>$1</h3>"); // headers

  // Convert ordered list (numbered steps)
  html = html.replace(/^(\d+)\.\s(.+)$/gm, "<li>$2</li>"); // replace "1. Step" with list item
  if (html.includes("<li>")) {
    html = `<ol>${html}</ol>`; // wrap list if any <li>
  }

  // Convert dashed lines to unordered list
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  if (html.match(/<li>/g)?.length > 1) {
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  }

  // Final cleanup
  html = html
    .replace(/\n{2,}/g, "<br><br>") // paragraph spacing
    .replace(/\n/g, "<br>"); // line breaks

  return html;
}

async function typeHtml(container, html, speed = 8) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const nodes = [...temp.childNodes];

  for (const node of nodes) {
    await new Promise((res) => setTimeout(res, speed));
    container.appendChild(node.cloneNode(true));
    container.scrollTop = container.scrollHeight;
  }
}

async function callAssistantAPI(message) {
  const assistant_id = "asst_R5CDQgGt5pnMYM2rLAPeY4oc"; // replace with your own if needed
  const api_key =
    "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";

  const headers = {
    Authorization: `Bearer ${api_key}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2",
  };

  try {
    const thread = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers,
      body: "{}",
    }).then((res) => res.json());

    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ role: "user", content: message }),
    });

    const run = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ assistant_id }),
      }
    ).then((res) => res.json());

    let status = "";
    let attempts = 0;
    while (status !== "completed" && attempts < 15) {
      await new Promise((res) => setTimeout(res, 1000));
      const check = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        { headers }
      ).then((res) => res.json());
      status = check.status;
      attempts++;
    }

    const messages = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      { headers }
    ).then((res) => res.json());
    const answer = messages.data.reverse().find((m) => m.role === "assistant");
    return answer?.content?.[0]?.text?.value;
  } catch (err) {
    return `[Error] ${err.message}`;
  }
}

// Function to log unanswered questions
async function logUnansweredQuestion(question) {
  console.log("Attempting to log question:", question);

  try {
    // Use a simple fetch request to a server endpoint
    const response = await fetch(
      "https://www.targetmetalsync.com/scripts/log-question.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
          timestamp: new Date().toISOString(),
        }),
      }
    );

    console.log("Response status:", response.status);

    if (response.ok) {
      const responseData = await response.json();
      console.log("Server response:", responseData);
      console.log("Question logged successfully!");
    } else {
      const errorText = await response.text();
      console.error(
        "Failed to log question. Server responded with:",
        response.status,
        errorText
      );
    }
  } catch (error) {
    console.error("Error logging question:", error.message);
    console.error("Full error:", error);
  }
}
