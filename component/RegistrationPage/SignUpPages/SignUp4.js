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
import Ionicons from "react-native-vector-icons/Ionicons"
import Heading from '../../headings/Heading';
import registerFormArr4 from '../SignUpArr/SignUpArr4';
import { useRoute } from '@react-navigation/native';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner';
import { DataContext } from '../../../context';


const SignUpForm4 = (m_props) => {

  const validationSchema = generateValidationSchema(registerFormArr4);
  const { handleErrorFunc } = useContext(DataContext);
  const initialValues = genrateInitalValues(registerFormArr4);
  const [button, setButton] = useState(false)
  const route = useRoute()
  const { email, name } = route.params;
  return (
    // <Background>
    <View style={{ alignItems: 'center', width: 400, marginTop: "10%" }}>
      <View
        style={{
          backgroundColor: 'white',
          height: 700,
          width: 370,
          borderTopLeftRadius: 30,
          paddingTop: 30,
          alignItems: 'center',
        }}>
        <View style={{

          flexDirection: 'row', alignItems: 'flex-start', width: "100%"
        }}>
        </View>
        <Heading mainHeading={"Create Account"} subHeading={"Set Secure Password"} />
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={(values, actions) => {
            setButton(true);
            const data = {
              email: email,
              password: values.password,
              name: name,
              password2: values.password2

            }
            axios.post(`${API_BASE_URL}/register/`, data).then((value) => {
              actions.resetForm();
              m_props.navigation.navigate("Login");
            }).catch((error) => {
              handleErrorFunc(error);
            }).finally(() => {
              setButton(false);
            });
          }}
        >
          {props => (
            <View
              style={{ width: "80%" }}>
              {registerFormArr4.map((element, index) => {
                const borderColor = props.errors[element.name] ? { color: "red", borderSz: 2 } : props.touched[element.name] ? { color: 'green', borderSz: 2 } : { color: 'black', borderSz: 1 }
                return (
                  <>
                    <TextInput
                      key={index} // Added key prop to satisfy React's requirements
                      style={{ borderRadius: 10, color: darkGreen, paddingHorizontal: 10, backgroundColor: 'rgb(220,220, 220)', marginVertical: 10, height: "14%", borderColor: borderColor.color, borderWidth: borderColor.borderSz }}
                      placeholder={element.placeholder}
                      onChangeText={props.handleChange(element.name)}
                      onFocus={() => {
                        props.setFieldTouched(element.name, true);
                      }}
                      onBlur={() => {
                        props.handleBlur(element.name);
                        props.setFieldTouched(element.name, false);
                      }}
                      secureTextEntry={element.name === "password" || element.name == "password2"}
                    />
                    {props.errors[element.name] ? (
                      <Text style={{ color: "red" }}>{props.errors[element.name]}</Text>
                    ) : null}
                  </>
                );
              })}
              {
                button ? <LoadingSpinner /> : <Btn textColor='white' bgColor={darkGreen} btnLabel="Next" Press={props.handleSubmit} width={"100%"} />
              }
              <Btn2 textColor={"green"} btnLabel="Already Have an Account" Press={() => { m_props.navigation.navigate("Login") }} width={"100%"} />
            </View>
          )}
        </Formik>
      </View>
    </View>
    // </Background>
  );
};

export default SignUpForm4;