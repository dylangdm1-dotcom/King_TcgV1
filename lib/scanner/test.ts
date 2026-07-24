import { loadOpenCV } from "./opencv";

export async function testOpenCV() {
  const cv = await loadOpenCV();
  console.log("OpenCV chargé :", cv.getBuildInformation());
}