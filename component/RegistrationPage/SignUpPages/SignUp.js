import React, { useContext, useState } from 'react';
import { View, Text, Touchable, TouchableOpacity, TextInput, Button, ActivityIndicator } from 'react-native';
import { darkGreen } from '../../Constants';
import Field from '../../Field';
import Btn, { Btn2 } from '../../Btn';
import Background from '../../Background';
import axios from 'axios';
import { API_BASE_URL } from '../../../config';
import { globalStyles } from '../../../styles/global';
import { Formik } from 'formik';
import generateValidationSchema from '../../GenrateValidationSchema/genrateValidationSchema';
import genrateInitalValues from '../../genrateInitialValues/InitialValues';
import registerFormArr from '../SignUpArr/SignUpArr';
import Toast from 'react-native-toast-message';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner';
import { DataContext } from '../../../context';

const SignUpForm = (m_props) => {

  const validationSchema = generateValidationSchema(registerFormArr);
  const initialValues = genrateInitalValues(registerFormArr);
  const [button, setButton] = useState(false);
  const { showErrorToast ,showSuccessToast, handleErrorFunc} = useContext(DataContext);
  
  return (
    <Background>
      <View style={{marginTop : "20%"}}>
                <Toast ref={(ref) => Toast.setRef(ref)} />
      </View>
      <View style={{ alignItems: 'center', width: 400, marginTop: "17%" }}>
        <View
          style={{
            backgroundColor: 'white',
            height: 700,
            width: 370,
            borderTopLeftRadius: 30,
            paddingTop: 30,
            alignItems: 'center',
            zIndex: 1
          }}>
          <Text style={{ fontSize: 40, color: darkGreen, fontWeight: 'bold' }}>
            Attendence App
          </Text>
          <Text
            style={{
              color: 'grey',
              fontSize: 19,
              fontWeight: 'bold',
              marginBottom: 20,
            }}>
            Login to your account
          </Text>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={(values, actions) => {
              setButton(true);
              axios.post(`${API_BASE_URL}/emailcheck/`, values).then((value) => {
                m_props.navigation.navigate("Signup2", {email: values.email})
              }).catch((error) => {
               handleErrorFunc(error);
              }).finally(() => {
                setButton(false);
              });
            }}
          >
            {props => (
              <View>
                {registerFormArr.map((element, index) => {
                  const borderColor =  props.errors[element.name] ? {color : "red", borderSz : 2} : props.touched[element.name] ? { color: 'green', borderSz: 2 } : { color: 'black', borderSz: 1 }
                  return (
                    <>
                      <TextInput
                        key={index} // Added key prop to satisfy React's requirements
                        style={{ borderRadius: 10, color: darkGreen, paddingHorizontal: 10, backgroundColor: 'rgb(220,220, 220)', marginVertical: 10, height: "20%", borderColor: borderColor.color, borderWidth: borderColor.borderSz }}
                        placeholder={element.placeholder}
                        onChangeText={props.handleChange(element.name)}
                        onFocus={() => {
                          props.setFieldTouched(element.name, true);
                        }}
                        onBlur={() => {
                          props.handleBlur(element.name);
                          props.setFieldTouched(element.name, false);
                        }}
                        secureTextEntry={element.name === "password"}
                      />
                      {props.errors[element.name] ? (
                        <Text style={{color: "red"}}>{props.errors[element.name]}</Text>
                      ) : null}
                    </>
                  );
                })}
                {button ?
                <LoadingSpinner />
                  : <Btn textColor='white' bgColor={darkGreen} btnLabel="Next" Press={props.handleSubmit} />
                }
               <Btn2 textColor={"green"} btnLabel="Already Have an Account" Press={()=>{m_props.navigation.navigate("Login")}}  />
              </View>
            )}
          </Formik>
        </View>
      </View>
    </Background>
  );
};

export default SignUpForm;