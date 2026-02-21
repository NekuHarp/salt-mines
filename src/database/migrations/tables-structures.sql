SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

--
-- Table structure for table `Fighters`
--

CREATE TABLE `Fighters` (
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) NOT NULL,
  `matches` int UNSIGNED NOT NULL DEFAULT 0,
  `wins` int UNSIGNED NOT NULL DEFAULT 0,
  `losses` int UNSIGNED NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Matchups`
--

CREATE TABLE `Matchups` (
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `p1Uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `p2Uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `matches` int UNSIGNED NOT NULL DEFAULT 0,
  `p1Wins` int UNSIGNED NOT NULL DEFAULT 0,
  `p2Wins` int UNSIGNED NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


--
-- Indexes for table `Fighters`
--
ALTER TABLE `Fighters`
  ADD PRIMARY KEY (`uuid`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `Contracts`
--
ALTER TABLE `Matchups`
  ADD PRIMARY KEY (`uuid`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `compositeKey` (`p1Uuid`,`p2Uuid`),
  ADD KEY `p1Uuid` (`p1Uuid`),
  ADD KEY `p2Uuid` (`p2Uuid`);


--
-- Constraints for dumped tables
--

--
-- Constraints for table `Contracts`
--
ALTER TABLE `Matchups`
  ADD CONSTRAINT `Matchups_ibfk_1` FOREIGN KEY (`p1Uuid`) REFERENCES `Fighters` (`uuid`) ON DELETE CASCADE ON UPDATE RESTRICT,
  ADD CONSTRAINT `Matchups_ibfk_2` FOREIGN KEY (`p2Uuid`) REFERENCES `Fighters` (`uuid`) ON DELETE CASCADE ON UPDATE RESTRICT;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
