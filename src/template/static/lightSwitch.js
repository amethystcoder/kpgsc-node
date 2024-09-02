/**
 * This file contains code for switching from light mode to dark mode
 */
function ToggleMode() {
    console.log("strting")
    let lightDarkContoller = document.querySelector(".light-dark-mode")
    let lightOrDark = localStorage.getItem("mode")
    if (lightOrDark) {
        if (lightOrDark == "dark") {
            localStorage.setItem("mode","light")
            lightDarkContoller.classList.remove("dark-control")
            lightDarkContoller.classList.add("light-control")
            setToLightMode()
        }
        if (lightOrDark == "light") {
            localStorage.setItem("mode","dark")
            lightDarkContoller.classList.remove("light-control")
            lightDarkContoller.classList.add("dark-control")
            setToDarkMode()
        }   
    }
    else{
        //since the mode is usually light mode normally, we should just set it to dark
        localStorage.setItem("mode","dark")
        lightDarkContoller.classList.remove("light-control")
        lightDarkContoller.classList.add("dark-control")
    }
}

window.addEventListener("load",(ev)=>{
    let lightOrDark = localStorage.getItem("mode")
    if (lightOrDark && lightOrDark == "dark") {
        setToDarkMode()
    }
})

function setToLightMode() {
    let texts = document.querySelectorAll("a, div, h1, h2, h3, h4,h5,h6,p,span,label")
    for (let index = 0; index < texts.length; index++) {
        texts[index].style.color = "black"
    }
    let buttons = document.querySelector("button")
    buttons.style.color = "white"
    /* let containers = document.querySelectorAll("div,span")
    for (let index = 0; index < containers.length; index++) {
        containers[index].style.backgroundColor = "rgba(255, 255, 255, 0.575)"
        containers[index].style.boxShadow = "box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;"
    } */
    let glassys = document.querySelectorAll(".glassy-dark")
    glassys.forEach((glassy)=>{
        glassy.classList.add("glassy")
        glassy.classList.remove("glassy-dark")
    })
    let inputs = document.querySelectorAll("input,textarea")
    for (let index = 0; index < inputs.length; index++) {
        inputs[index].style.backgroundColor = "transparent"
        inputs[index].style.borderBottom = "solid thin rgb(151, 151, 151)"
        inputs[index].style.color = "black"
    }
    let body = document.querySelector("body")
    body.style.backgroundColor = "white"
    //let divs = document.querySelector("div")
    //divs.style.backgroundColor = "white"
}

function setToDarkMode() {
    let texts = document.querySelectorAll("a, div, h1, h2, h3, h4,h5,h6,p,span,label")
    for (let index = 0; index < texts.length; index++) {
        texts[index].style.color = "white"
    }
    let buttons = document.querySelector("button")
    buttons.style.color = "black"
    //let svgs = document.querySelectorAll("svg,g")
/*     let containers = document.querySelectorAll("div,span")
    for (let index = 0; index < containers.length; index++) {
        containers[index].style.backgroundColor = "rgba(28, 28, 28, 0.575);"
        containers[index].style.boxShadow = "none"
    }
 */    
    let glassys = document.querySelectorAll(".glassy")
    glassys.forEach((glassy)=>{
        glassy.classList.add("glassy-dark")
        glassy.classList.remove("glassy")
    })
    let inputs = document.querySelectorAll("input,textarea")
    for (let index = 0; index < inputs.length; index++) {
        inputs[index].style.backgroundColor = "transparent"
        inputs[index].style.borderBottom = "solid thin white"
        inputs[index].style.color = "white"
    }
    let body = document.querySelector("body")
    body.style.backgroundColor = "#121212"
    //let divs = document.querySelector("div")
    //divs.style.backgroundColor = "black"
}