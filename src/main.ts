import { MYCONSTANT } from "./lib";

const cv = document.createElement("canvas");
document.appendChild(cv);

const ctx = cv.getContext('2d')

function resize() {
	cv.width = window.innerWidth;
	cv.height = window.innerHeight;
	cv.style.width = cv.width.toString() + "px"
	cv.style.height = cv.height.toString() + "px"
}
resize()
window.addEventListener("resize", resize)

console.log(MYCONSTANT)