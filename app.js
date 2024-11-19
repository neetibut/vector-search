const axios = require("axios");
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MDB_CONNECTION_STRING = process.env.MDB_CONNECTION_STRING;

async function getEmbedding(query) {
  // Define the OpenAI API url and key.
  const url = "https://api.openai.com/v1/embeddings";
  // Call OpenAI API to get the embeddings.
  let response = await axios.post(
    url,
    {
      input: query,
      model: "text-embedding-ada-002",
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  //
  if (response.status === 200) {
    return response.data.data[0].embedding;
  } else {
    throw new Error(`Failed to get embedding. Status code: ${response.status}`);
  }
}

async function findSimilarDocuments(embedding) {
  const client = new MongoClient(MDB_CONNECTION_STRING);
  try {
    await client.connect();
    const db = client.db("sample_mflix");
    const collection = db.collection("embedded_movies");
    // Query for similar documents.
    const documents = await collection
      .aggregate([
        {
          $vectorSearch: {
            queryVector: embedding,
            path: "plot_embedding",
            numCandidates: 100,
            limit: 5,
            index: "moviesPlotIndex",
          },
        },
        {
          $project: {
            _id: 0,
            title: 1,
            plot: 1,
          },
        },
      ])
      .toArray();
    return documents;
  } finally {
    await client.close();
  }
}

async function main() {
  const query = "super hero in a black dress";
  try {
    const embedding = await getEmbedding(query);
    const documents = await findSimilarDocuments(embedding);
    console.log(documents);
  } catch (e) {
    console.error(e);
  }
}

main();
