import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:equatable/equatable.dart';

abstract class SettingsState extends Equatable {
  final bool isDarkMode;
  const SettingsState({required this.isDarkMode});
  @override
  List<Object> get props => [isDarkMode];
}

class SettingsInitial extends SettingsState {
  const SettingsInitial({super.isDarkMode = false});
}

class SettingsUpdated extends SettingsState {
  const SettingsUpdated({required super.isDarkMode});
}

@lazySingleton
class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit() : super(const SettingsInitial());

  void toggleTheme() {
    emit(SettingsUpdated(isDarkMode: !state.isDarkMode));
  }
}
