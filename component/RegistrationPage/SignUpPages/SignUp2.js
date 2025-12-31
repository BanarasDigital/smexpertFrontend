import React, { useState } from 'react';
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
import Toast from 'react-native-toast-message';
import registerFormArr2 from '../SignUpArr/SignUpArr2';
import Ionicons from "react-native-vector-icons/Ionicons"
import Heading from '../../headings/Heading';
import { useRoute } from '@react-navigation/native';


const SignUpForm2 = (m_props) => {

  const validationSchema = generateValidationSchema(registerFormArr2);
  const initialValues = genrateInitalValues(registerFormArr2);
const route = useRoute()
  const { email } = route.params;
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
              flexDirection: 'row', alignItems: 'flex-start', width : "100%"
            }}>

            {/* <Ionicons name={"arrow-back"} size={20} color={"black"} style={{
               flexDirection: 'row',
               alignItems: 'flex-start',
               justifyContent: 'flex-start',
               paddingHorizontal: 20,
            }}/> */}
            </View>

            <Heading mainHeading={"Create Account"} subHeading={"Personal Details"} />
           
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={(values, actions) => {
              // setButton(true);
              m_props.navigation.navigate("Signup3", {email : email , name : `${values.name1} ${values.name2}`})
            }}
          >
            {props => (
              <View
              style={{width : "80%" }}>
                {registerFormArr2.map((element, index) => {
                  const borderColor =  props.errors[element.name] ? {color : "red", borderSz : 2} : props.touched[element.name] ? { color: 'green', borderSz: 2 } : { color: 'black', borderSz: 1 }
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
                        secureTextEntry={element.name === "password"}
                      />
                      {props.errors[element.name] ? (
                        <Text style={{color: "red"}}>{props.errors[element.name]}</Text>
                      ) : null}
                    </>
                  );
                })}
                 <Btn textColor='white' bgColor={darkGreen} btnLabel="Next" Press={props.handleSubmit} width={"100%"}/>
               <Btn2 textColor={"green"} btnLabel="Already Have an Account" Press={()=>{m_props.navigation.navigate("Login")}}  width={"100%"} />
              </View>
            )}
          </Formik>
        </View>
      </View>
    // </Background>
  );
};

export default SignUpForm2;