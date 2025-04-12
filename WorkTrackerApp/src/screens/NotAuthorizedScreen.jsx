import React from 'react';
import { View, Text } from 'react-native';

const NotAuthorizedScreen = () => {
  return (
    <View className="flex-1 justify-center items-center p-5">
      <Text className="text-lg font-bold text-center text-red-500">
        No tienes permiso para acceder a esta pantalla.
      </Text>
    </View>
  );
};

export default NotAuthorizedScreen;