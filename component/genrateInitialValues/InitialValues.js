const genrateInitalValues = (inputArr)=>{
    let initialValues = {};

    inputArr.forEach(element => {
        if(element.type == "array"){
            initialValues[element.name] = []
        }
        else{
            initialValues[element.name] = ""
        }
    })
    return initialValues;
}

export default genrateInitalValues;