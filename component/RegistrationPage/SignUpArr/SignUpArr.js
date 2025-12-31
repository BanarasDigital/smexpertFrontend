import { Icon } from "react-native-vector-icons/FontAwesome";


const iconStyles = {
    position: 'absolute',
    top: 2,
    borderTopWidth: 1,
    borderColor: 'black',
    color: 'violet', // Assuming you have defined your colors somewhere
  };

const registerFormArr = [
    {
        "name": "email",
        "type": "email",
        "required": true,
        "placeholder": "Enter your email address",
    },
    // {
    //     "name": "name",
    //     "type": "text",
    //     "required": true,
    //     "placeholder": "Enter your Name",
    // },
    // {
    //     "name": "phone",
    //     "type": "tel",
    //     "required": true,
    //     "placeholder": "Enter your phone number",
    //     "icon": <Icon name="phone" size={30} color="#900" style={iconStyles} />
    // },
    // {
    //     "name": "address",
    //     "type": "text",
    //     "required": true,
    //     "placeholder": "Enter your address",
    //     "icon": <Icon name="location" size={30} color="#900" style={iconStyles} />
    // },
    // {
    //     "name": "password",
    //     "type": "password",
    //     "required": true,
    //     "placeholder": "Enter your password",
    // },
    // {
    //     "name": "confirmPassword",
    //     "type": "password",
    //     "required": true,
    //     "placeholder": "Confirm your password",
    // }
]

export default registerFormArr;
