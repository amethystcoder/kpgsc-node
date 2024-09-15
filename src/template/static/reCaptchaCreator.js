window.addEventListener("DOMContentLoaded",async ()=>{
    try {
        const captchaContainer = document.querySelector(".container-for-captcha")
        const canvas = document.createElement("canvas")
        const canvasContext = canvas.getContext("2d")

        //get the number from the server side
        let captchaCode = await (await fetch("../api/captcha/code")).json()
        canvasContext.font = "48px serif";
        canvasContext.fillStyle = "#FFA500";
        canvasContext.fillText(captchaCode.message, 10, 50);
        captchaContainer.appendChild(canvas)
    } catch (error) {
        console.log(error)
    }
})