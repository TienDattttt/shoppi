import 'dart:io';
import 'package:url_launcher/url_launcher.dart';

class MapUtils {
  MapUtils._();

  static Future<void> openMap(double latitude, double longitude) async {
    String googleUrl = 'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude';
    String appleUrl = 'https://maps.apple.com/?sll=$latitude,$longitude';
    
    if (Platform.isIOS) {
       if (await canLaunchUrl(Uri.parse(appleUrl))) {
        await launchUrl(Uri.parse(appleUrl), mode: LaunchMode.externalApplication);
      } else {
         if (await canLaunchUrl(Uri.parse(googleUrl))) {
          await launchUrl(Uri.parse(googleUrl), mode: LaunchMode.externalApplication);
        }
      }
    } else {
      if (await canLaunchUrl(Uri.parse(googleUrl))) {
        await launchUrl(Uri.parse(googleUrl), mode: LaunchMode.externalApplication);
      }
    }
  }

  static Future<void> openNavigation(double lat, double lng) async {
     String googleUrl = 'google.navigation:q=$lat,$lng';
     String appleUrl = 'https://maps.apple.com/?daddr=$lat,$lng';
     
     if (Platform.isIOS) {
       if (await canLaunchUrl(Uri.parse(appleUrl))) {
        await launchUrl(Uri.parse(appleUrl), mode: LaunchMode.externalApplication);
      }
     } else { // Android
       if (await canLaunchUrl(Uri.parse(googleUrl))) {
        await launchUrl(Uri.parse(googleUrl), mode: LaunchMode.externalApplication);
      } else {
        // Fallback to web map
        String webUrl = 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
        if (await canLaunchUrl(Uri.parse(webUrl))) {
           await launchUrl(Uri.parse(webUrl), mode: LaunchMode.externalApplication);
        }
      }
     }
  }
}
