import Icon from "react-native-vector-icons/FontAwesome";

const iconStyles = {
    position: 'absolute',
    top: 2,
    borderTopWidth: 1,
    borderColor: 'black',
    color: 'violet', // Assuming you have defined your colors somewhere
  };
  
const inputLoginArr = [{
    "type": "email",
   "id": "email",
    "name": "email",
    "required": true,
    "placeholder": "Enter your Email",
    "icon":  <Icon name="rocket" size={30} color="#900" style={iconStyles}/>
  }, {
    "type": "password",
   "id": "password",
    "name": "password",
    "required": true,
    "placeholder": "Enter Your Password",
    "icon": <Icon name="user" size={30} color="#900" style={iconStyles}/>
  }]

export default inputLoginArr;