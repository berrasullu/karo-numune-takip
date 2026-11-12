import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

/**
 * Cihazdan bir fotoğraf seçer ve yerel dosya sistemine kaydeder.
 * Seçilen fotoğrafın yerel URI'sini döndürür.
 */
export async function pickAndSavePhoto(): Promise<string | null> {
  try {
    // İzin kontrolü
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      console.warn("Media library permission denied");
      return null;
    }

    // Fotoğraf seçme
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) {
      return null;
    }

    const selectedAsset = result.assets[0];
    if (!selectedAsset?.uri) {
      return null;
    }

    // Seçilen fotoğrafı yerel dizine kopyala
    const photoDir = `${FileSystem.documentDirectory}photos`;
    const dirInfo = await FileSystem.getInfoAsync(photoDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
    }

    const fileName = `photo-${Date.now()}.jpg`;
    const localUri = `${photoDir}/${fileName}`;

    // Fotoğrafı kopyala
    await FileSystem.copyAsync({
      from: selectedAsset.uri,
      to: localUri,
    });

    return localUri;
  } catch (error) {
    console.error("Photo selection error:", error);
    return null;
  }
}

/**
 * Yerel fotoğraf dosyasını siler.
 */
export async function deletePhoto(photoUri: string): Promise<boolean> {
  try {
    if (!photoUri) return false;

    const fileInfo = await FileSystem.getInfoAsync(photoUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(photoUri);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Photo deletion error:", error);
    return false;
  }
}

/**
 * Fotoğraf URI'sinin geçerli olup olmadığını kontrol eder.
 */
export async function isPhotoValid(photoUri: string): Promise<boolean> {
  try {
    if (!photoUri) return false;

    const fileInfo = await FileSystem.getInfoAsync(photoUri);
    return fileInfo.exists === true;
  } catch (error) {
    console.error("Photo validation error:", error);
    return false;
  }
}
