import 'package:flutter/material.dart';
import 'package:hydrated_bloc/hydrated_bloc.dart';
import 'package:injectable/injectable.dart';

// Theme States
abstract class ThemeState {}

class SystemTheme extends ThemeState {}
class LightTheme extends ThemeState {}
class DarkTheme extends ThemeState {}

@lazySingleton
class ThemeCubit extends HydratedCubit<ThemeState> {
  ThemeCubit() : super(SystemTheme());

  void setLightTheme() => emit(LightTheme());
  void setDarkTheme() => emit(DarkTheme());
  void setSystemTheme() => emit(SystemTheme());
  
  void toggleTheme() {
    if (state is DarkTheme) {
      emit(LightTheme());
    } else {
      emit(DarkTheme());
    }
  }

  ThemeMode get themeMode {
    if (state is LightTheme) return ThemeMode.light;
    if (state is DarkTheme) return ThemeMode.dark;
    return ThemeMode.system;
  }

  @override
  ThemeState? fromJson(Map<String, dynamic> json) {
    switch (json['theme'] as String?) {
      case 'light':
        return LightTheme();
      case 'dark':
        return DarkTheme();
      case 'system':
      default:
        return SystemTheme();
    }
  }

  @override
  Map<String, dynamic>? toJson(ThemeState state) {
    String themeStr;
    if (state is LightTheme) {
      themeStr = 'light';
    } else if (state is DarkTheme) {
      themeStr = 'dark';
    } else {
      themeStr = 'system';
    }
    return {'theme': themeStr};
  }
}
