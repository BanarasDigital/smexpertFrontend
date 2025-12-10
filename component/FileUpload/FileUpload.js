import * as DocumentPicker from 'expo-document-picker';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FileAttachment = ({ navigation, setFile }) => {
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setFile(uri);

      // Pass URI to ImageEditScreen via route params
      navigation.navigate("ImageEditScreen", { imageUri: uri });
    }
  }

  return (
    <TouchableOpacity onPress={pickFile}>
      <Ionicons name="attach-outline" size={24} color="#555" />
    </TouchableOpacity>
  );
};

export default FileAttachment;
