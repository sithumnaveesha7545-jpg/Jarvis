const express = require("express");
const Groq = require("groq-sdk");
const fs = require("fs");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));


// ========================================
// GROQ
// ========================================

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.log("❌ GROQ_API_KEY හම්බවුණේ නැහැ!");
    console.log("ඔයාගේ .env file එක check කරන්න.");
    process.exit(1);
}

const groq = new Groq({
    apiKey: apiKey
});


// ========================================
// MEMORY
// ========================================

const memoryFile = "./memory.json";

let memory = {
    name: "",
    facts: []
};


try {

    if (fs.existsSync(memoryFile)) {

        const data =
            fs.readFileSync(
                memoryFile,
                "utf8"
            );

        const saved =
            JSON.parse(data);

        memory = {
            name: saved.name || "",
            facts: Array.isArray(saved.facts)
                ? saved.facts
                : []
        };

    }

} catch (error) {

    console.log(
        "⚠️ Memory load error:",
        error.message
    );

}


// ========================================
// SAVE MEMORY
// ========================================

function saveMemory() {

    try {

        fs.writeFileSync(
            memoryFile,
            JSON.stringify(
                memory,
                null,
                2
            ),
            "utf8"
        );

        console.log(
            "💾 Memory saved."
        );

    } catch (error) {

        console.log(
            "❌ Memory save error:",
            error.message
        );

    }

}


// ========================================
// GET MEMORY
// ========================================

app.get(
    "/memory",
    function(req, res) {

        res.json({
            name: memory.name,
            facts: memory.facts
        });

    }
);


// ========================================
// CHAT
// ========================================

app.post(
    "/chat",
    async function(req, res) {

        try {

            const message =
                String(
                    req.body.message || ""
                ).trim();


            if (!message) {

                return res.json({

                    reply:
                        "මොනවාහරි message එකක් type කරන්න."

                });

            }


            console.log("");
            console.log(
                "👤 User:",
                message
            );


            // ========================================
            // REMEMBER NAME
            // ========================================

            const lower =
                message.toLowerCase();


            if (
                lower.startsWith(
                    "my name is "
                )
            ) {

                const newName =
                    message
                        .substring(11)
                        .trim();


                if (
                    newName &&
                    !newName.includes("?")
                ) {

                    memory.name =
                        newName;

                    saveMemory();

                    console.log(
                        "🧠 Name remembered:",
                        memory.name
                    );

                }

            }


            else if (
                message.startsWith(
                    "මගේ නම "
                ) &&
                !message.includes(
                    "මොකක්ද"
                ) &&
                !message.includes("?")
            ) {

                const newName =
                    message
                        .substring(7)
                        .trim();


                if (newName) {

                    memory.name =
                        newName;

                    saveMemory();

                    console.log(
                        "🧠 Name remembered:",
                        memory.name
                    );

                }

            }


            // ========================================
            // MEMORY TEXT
            // ========================================

            let memoryText = "";


            if (memory.name) {

                memoryText +=
                    "\nThe user's name is " +
                    memory.name +
                    ".\n";

            }


            if (
                memory.facts.length > 0
            ) {

                memoryText +=
                    "\nRemembered facts:\n" +
                    memory.facts.join("\n") +
                    "\n";

            }


            // ========================================
            // SYSTEM PROMPT
            // ========================================

            const systemPrompt = `
You are Jarvis , a friendly AI assistant.

You understand Sinhala and English.

IMPORTANT:
- Reply naturally in Sinhala when the user speaks Sinhala.
- Reply in English when the user speaks English.
- Do not unnecessarily mix English into Sinhala.
- Use normal Sri Lankan Sinhala.
- Keep answers concise and useful.
- If the user asks "මගේ නම මොකක්ද?", use the stored name.
- Never say the stored name is "මොකක්ද".
${memoryText}
`;


            console.log(
                "🤖 Sending to Groq..."
            );


            // ========================================
            // GROQ
            // ========================================

            const completion =
                await groq.chat.completions.create({

                    model:
                        "openai/gpt-oss-20b",

                    messages: [

                        {
                            role:
                                "system",

                            content:
                                systemPrompt

                        },

                        {
                            role:
                                "user",

                            content:
                                message

                        }

                    ],

                    temperature:
                        0.5,

                    max_tokens:
                        500

                });


            const reply =
                completion
                    .choices[0]
                    .message
                    .content
                    .trim();


            console.log(
                "🤖 AI:",
                reply
            );


            res.json({

                reply:
                    reply

            });


        } catch (error) {

            console.error(
                "❌ Groq Error:",
                error
            );


            if (
                error.status === 401
            ) {

                return res.status(401).json({

                    reply:
                        "❌ Groq API key එක වැරදියි. .env file එක check කරන්න."

                });

            }


            if (
                error.status === 429
            ) {

                return res.status(429).json({

                    reply:
                        "⏳ Groq API limit එක දැනට ඉවරයි. ටික වෙලාවකින් නැවත try කරන්න."

                });

            }


            if (
                error.status === 413
            ) {

                return res.status(413).json({

                    reply:
                        "❌ Request එක ලොකු වැඩියි. Message එක කෙටි කරලා try කරන්න."

                });

            }


            res.status(500).json({

                reply:
                    "❌ Groq AI error එකක් වුණා. CMD එක බලන්න."

            });

        }

    }
);


// ========================================
// START SERVER
// ========================================

app.listen(
    3000,
    function() {

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "🤖 My AI started!"
        );
        console.log(
            "🧠 Permanent Memory: ON"
        );
        console.log(
            "💬 Chat System: ON"
        );
        console.log(
            "🇱🇰 Sinhala AI: ON"
        );
        console.log(
            "🔊 Voice Output: Browser"
        );
        console.log(
            "================================"
        );
        console.log(
            "🌐 Open: http://localhost:3000"
        );
        console.log("");

    }
);