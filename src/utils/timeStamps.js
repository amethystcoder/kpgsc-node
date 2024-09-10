
/**
 * 
 * @param {string} timeStamp 
 */
const convertTimeStampToSeconds = (timeStamp)=>{
    //get time in seconds
    let allTimeSegments = timeStamp.split(":")
    let timeStampInSeconds = 0
    let divider = 1
    for (let index = allTimeSegments.length - 1; index >= 0; index--) {
        if (allTimeSegments[index].includes(".")) {
            let secondsTimeMark = allTimeSegments[index].split(".")[0]
            timeStampInSeconds += (Number(secondsTimeMark) / divider)
        }
        else timeStampInSeconds += (Number(allTimeSegments[index]) / divider)
        divider = divider / 60
    }
    
    return timeStampInSeconds
}

/**
 * 
 * @param {string} timeStamp 
 */
const convertTimeStampToMinutes = (timeStamp)=>{
    //get time in seconds
    let allTimeSegments = timeStamp.split(":")
    let timeStampInMinutes = 0
    let divider = 60
    for (let index = allTimeSegments.length - 1; index >= 0; index--) {
        if (allTimeSegments[index].includes(".")) {
            let secondsTimeMark = allTimeSegments[index].split(".")[0]
            timeStampInMinutes += (Number(secondsTimeMark) / divider)
        }
        else timeStampInMinutes += (Number(allTimeSegments[index]) / divider)
        divider = divider / 60
    }
    
    return timeStampInMinutes
}

/**
 * 
 * @param {string} timeStamp 
 */
const convertTimeStampToHours = (timeStamp)=>{
    //get time in seconds
    let allTimeSegments = timeStamp.split(":")
    let timeStampInHours = 0
    let divider = 60
    for (let index = allTimeSegments.length - 1; index >= 0; index--) {
        if (allTimeSegments[index].includes(".")) {
            let secondsTimeMark = allTimeSegments[index].split(".")[0]
            timeStampInHours += (Number(secondsTimeMark) / divider)
        }
        else timeStampInHours += (Number(allTimeSegments[index]) / divider)
        divider = divider / 60
    }
    
    return timeStampInHours
}