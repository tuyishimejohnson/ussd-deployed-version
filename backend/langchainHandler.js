require("dotenv").config();

const { ChatOpenAI } = require("@langchain/openai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { RetrievalQAChain } = require("langchain/chains");

const openAIApiKey = process.env.OPENAI_API_KEY;

async function processQuery(userInput, records) {
  const textData = records
    .map((rec, i) => `Case ${i + 1} (${rec.type}): ${JSON.stringify(rec)}`)
    .join("\n\n");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 100,
  });

  const docs = await splitter.createDocuments([textData]);

  const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    new OpenAIEmbeddings({ openAIApiKey })
  );

  const model = new ChatOpenAI({
    temperature: 0.3,
    openAIApiKey,
    modelName: "gpt-4",
  });

  const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());

  const response = await chain.call({ query: userInput });

  return response.text;
}

module.exports = { processQuery };
