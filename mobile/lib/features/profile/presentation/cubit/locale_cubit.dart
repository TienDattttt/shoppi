import 'package:flutter/material.dart';
import 'package:hydrated_bloc/hydrated_bloc.dart';
import 'package:injectable/injectable.dart';

// Locale States
abstract class LocaleState {
  Locale get locale;
}

class VietnameseLocale extends LocaleState {
  @override
  Locale get locale => const Locale('vi', '');
}

class EnglishLocale extends LocaleState {
  @override
  Locale get locale => const Locale('en', '');
}

@lazySingleton
class LocaleCubit extends HydratedCubit<LocaleState> {
  LocaleCubit() : super(VietnameseLocale()); // Default Vietnamese

  void setVietnamese() => emit(VietnameseLocale());
  void setEnglish() => emit(EnglishLocale());
  
  void toggleLocale() {
    if (state is VietnameseLocale) {
      emit(EnglishLocale());
    } else {
      emit(VietnameseLocale());
    }
  }

  void changeLocale(String languageCode) {
    if (languageCode == 'vi') {
      emit(VietnameseLocale());
    } else {
      emit(EnglishLocale());
    }
  }

  @override
  LocaleState? fromJson(Map<String, dynamic> json) {
    final locale = json['locale'] as String?;
    if (locale == 'en') {
      return EnglishLocale();
    }
    return VietnameseLocale();
  }

  @override
  Map<String, dynamic>? toJson(LocaleState state) {
    return {'locale': state.locale.languageCode};
  }
}
