import React from 'react'
import './style.css'
import {
  FaGithub,
  FaTwitter,
  FaFacebookF,
  FaLinkedin,
  FaYoutube,
  FaTwitch,
  FaMailBulk,
  FaEnvelope,
  FaItchIo,
} from 'react-icons/fa'
import { socialProfiles } from '../../content_option'

export const SocialIcons = (params) => {
  return (
    <div className="stick_follow_icon">
      <ul>
        {socialProfiles.email && (
          <li className="grow">
            <a href={socialProfiles.email} target="_blank" rel="noreferrer">
              <FaEnvelope />
            </a>
          </li>
        )}
        {socialProfiles.unreal && (
          <li className="grow">
            <a href={socialProfiles.unreal} target="_blank" rel="noreferrer">
              <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <title>Unreal Engine</title>
                <path d="M12 0a12 12 0 1012 12A12 12 0 0012 0zm0 23.52A11.52 11.52 0 1123.52 12 11.52 11.52 0 0112 23.52zm7.13-9.791c-.206.997-1.126 3.557-4.06 4.942l-1.179-1.325-1.988 2a7.338 7.338 0 01-5.804-2.978 2.859 2.859 0 00.65.123c.326.006.678-.114.678-.66v-5.394a.89.89 0 00-1.116-.89c-.92.212-1.656 2.509-1.656 2.509a7.304 7.304 0 012.528-5.597 7.408 7.408 0 013.73-1.721c-1.006.573-1.57 1.507-1.57 2.29 0 1.262.76 1.109.984.923v7.28a1.157 1.157 0 00.148.256 1.075 1.075 0 00.88.445c.76 0 1.747-.868 1.747-.868V9.172c0-.6-.452-1.324-.905-1.572 0 0 .838-.149 1.484.346a5.537 5.537 0 01.387-.425c1.508-1.48 2.929-1.902 4.112-2.112 0 0-2.151 1.69-2.151 3.96 0 1.687.043 5.801.043 5.801.799.771 1.986-.342 3.059-1.441Z" />
              </svg>
            </a>
          </li>
        )}
        {socialProfiles.gumroad && (
          <li className="grow">
            <a href={socialProfiles.gumroad} target="_blank" rel="noreferrer">
              <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <title>Gumroad</title>
                <path d="M15.826 15.069a1.018 1.018 0 1 1-.001 2.036 1.018 1.018 0 0 1 0-2.036zM21.327 1.11a1.018 1.018 0 1 1 .001 2.036 1.018 1.018 0 0 1 0-2.036zM3.322 3.107h16.116a2.13 2.13 0 0 0 1.89 1.151c1.174 0 2.129-.955 2.129-2.13A2.131 2.131 0 0 0 21.327 0c-.89 0-1.654.55-1.97 1.329H3.321C1.764 1.329.543 2.51.543 4.019v17.156C.543 22.706 1.816 24 3.322 24h17.155c1.51 0 2.738-1.267 2.738-2.825V10.998c0-1.532-1.228-2.78-2.738-2.78H10.3c-1.553 0-2.866 1.274-2.866 2.78v3.198c0 1.484 1.286 2.691 2.866 2.691h3.554a2.132 2.132 0 0 0 1.972 1.329c1.174 0 2.129-.956 2.129-2.13s-.955-2.129-2.13-2.129a2.13 2.13 0 0 0-1.889 1.152H10.3c-.523 0-1.088-.349-1.088-.913v-3.198c0-.524.519-1 1.088-1h10.177c.538 0 .96.439.96 1v10.177c0 .567-.44 1.047-.96 1.047H3.322c-.533 0-1-.49-1-1.047V4.02c0-.52.43-.912 1-.912" />
              </svg>
            </a>
          </li>
        )}
        {socialProfiles.youtube && (
          <li className="grow">
            <a href={socialProfiles.youtube} target="_blank" rel="noreferrer">
              <FaYoutube />
            </a>
          </li>
        )}
        {socialProfiles.itch && (
          <li className="grow">
            <a href={socialProfiles.itch} target="_blank" rel="noreferrer">
              <FaItchIo />
            </a>
          </li>
        )}
      </ul>
      {/*<p>Monitor Lizards</p>*/}
    </div>
  )
}
